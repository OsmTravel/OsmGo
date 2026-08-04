import type { OsmGoFeature, OsmGoFeatureCollection } from '@osmgo/type'

export const OSM_STATE_STORAGE_KEY = 'osmState'
export const OSM_STATE_SCHEMA_VERSION = 2

export interface PersistedUploadSummary {
    Total: number
    Create: number
    Update: number
    Delete: number
}

interface PersistedUploadJournalBase {
    attemptId: string
    payloadHash: string
    changesetId: string
    submittedIds: string[]
    summary: PersistedUploadSummary
    startedAt: string
}

interface PersistedUploadJournalV1Base extends PersistedUploadJournalBase {
    journalVersion: 1
}

export interface PersistedUploadSubmission {
    oldId: string
    operation: 'Create' | 'Update' | 'Delete'
    feature: OsmGoFeature
}

interface PersistedUploadJournalV2Base extends PersistedUploadJournalBase {
    journalVersion: 2
    payload: string
    submissions: PersistedUploadSubmission[]
}

type PersistedUploadJournalPhase<Base> = Base &
    (
        | { phase: 'prepared' }
        | {
              phase: 'acknowledged'
              rawReceipt: unknown
              acknowledgedAt: string
          }
        | {
              phase: 'applied'
              rawReceipt: unknown
              acknowledgedAt: string
              appliedAt: string
          }
    )

export type PersistedUploadJournal =
    | PersistedUploadJournalPhase<PersistedUploadJournalV1Base>
    | PersistedUploadJournalPhase<PersistedUploadJournalV2Base>

export interface PersistedOsmStateV2 {
    schemaVersion: 2
    revision: number
    officialById: Record<string, OsmGoFeature>
    pendingById: Record<string, OsmGoFeature>
    bbox: OsmGoFeatureCollection
    nextTemporaryId: number
    uploadJournal?: PersistedUploadJournal
}

export interface PersistedOsmStateV1 {
    schemaVersion: 1
    revision?: number
    geojson?: OsmGoFeatureCollection
    geojsonChanged?: OsmGoFeatureCollection
    geojsonBbox?: OsmGoFeatureCollection
    nextFeatureId?: number
    uploadJournal?: PersistedUploadJournal
}

export class OsmStatePersistenceError extends Error {
    readonly name = 'OsmStatePersistenceError'

    constructor(
        readonly operation: string,
        readonly revision: number,
        options: ErrorOptions
    ) {
        super(
            `Could not persist OSM state revision ${revision} (${operation}).`,
            options
        )
    }
}

export interface LegacyOsmState {
    geojson?: OsmGoFeatureCollection | null
    geojsonChanged?: OsmGoFeatureCollection | null
    geojsonBbox?: OsmGoFeatureCollection | null
}

const emptyFeatureCollection = (): OsmGoFeatureCollection => ({
    type: 'FeatureCollection',
    features: [],
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const requireNonEmptyString = (value: unknown, label: string): string => {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`The persisted ${label} is invalid.`)
    }
    return value
}

const requireUploadSummary = (value: unknown): PersistedUploadSummary => {
    if (!isRecord(value)) {
        throw new Error('The persisted upload journal summary is invalid.')
    }
    const counts = [
        value['Total'],
        value['Create'],
        value['Update'],
        value['Delete'],
    ]
    if (
        counts.some(
            (count) =>
                typeof count !== 'number' ||
                !Number.isInteger(count) ||
                count < 0
        )
    ) {
        throw new Error('The persisted upload journal summary is invalid.')
    }
    const summary: PersistedUploadSummary = {
        Total: value['Total'] as number,
        Create: value['Create'] as number,
        Update: value['Update'] as number,
        Delete: value['Delete'] as number,
    }
    if (summary.Total !== summary.Create + summary.Update + summary.Delete) {
        throw new Error('The persisted upload journal summary is invalid.')
    }
    return summary
}

const requireUploadJournal = (value: unknown): PersistedUploadJournal => {
    if (
        !isRecord(value) ||
        (value['journalVersion'] !== 1 && value['journalVersion'] !== 2)
    ) {
        throw new Error('The persisted upload journal is invalid.')
    }
    const submittedIds = value['submittedIds']
    if (
        !Array.isArray(submittedIds) ||
        submittedIds.length === 0 ||
        submittedIds.some((id) => typeof id !== 'string' || id.trim() === '') ||
        new Set(submittedIds).size !== submittedIds.length
    ) {
        throw new Error('The persisted upload journal IDs are invalid.')
    }
    const commonBase: PersistedUploadJournalBase = {
        attemptId: requireNonEmptyString(
            value['attemptId'],
            'upload attempt ID'
        ),
        payloadHash: requireNonEmptyString(
            value['payloadHash'],
            'upload payload hash'
        ),
        changesetId: requireNonEmptyString(
            value['changesetId'],
            'upload changeset ID'
        ),
        submittedIds: [...submittedIds],
        summary: requireUploadSummary(value['summary']),
        startedAt: requireNonEmptyString(
            value['startedAt'],
            'upload start timestamp'
        ),
    }
    const base: PersistedUploadJournalV1Base | PersistedUploadJournalV2Base =
        value['journalVersion'] === 1
            ? { ...commonBase, journalVersion: 1 }
            : requireUploadJournalV2Base(value, commonBase)
    if (value['phase'] === 'prepared') {
        return { ...base, phase: 'prepared' }
    }
    const acknowledgedAt = requireNonEmptyString(
        value['acknowledgedAt'],
        'upload acknowledgement timestamp'
    )
    if (value['phase'] === 'acknowledged') {
        return {
            ...base,
            phase: 'acknowledged',
            rawReceipt: structuredClone(value['rawReceipt']),
            acknowledgedAt,
        }
    }
    if (value['phase'] === 'applied') {
        return {
            ...base,
            phase: 'applied',
            rawReceipt: structuredClone(value['rawReceipt']),
            acknowledgedAt,
            appliedAt: requireNonEmptyString(
                value['appliedAt'],
                'upload application timestamp'
            ),
        }
    }
    throw new Error('The persisted upload journal phase is invalid.')
}

const requireUploadJournalV2Base = (
    value: Record<string, unknown>,
    commonBase: PersistedUploadJournalBase
): PersistedUploadJournalV2Base => {
    const payload = requireNonEmptyString(value['payload'], 'upload payload')
    const sourceSubmissions = value['submissions']
    if (!Array.isArray(sourceSubmissions) || sourceSubmissions.length === 0) {
        throw new Error('The persisted upload journal submissions are invalid.')
    }

    const submissions: PersistedUploadSubmission[] = sourceSubmissions.map(
        (sourceSubmission) => {
            if (!isRecord(sourceSubmission)) {
                throw new Error(
                    'The persisted upload journal submissions are invalid.'
                )
            }
            const oldId = requireNonEmptyString(
                sourceSubmission['oldId'],
                'upload submission ID'
            )
            const operation = sourceSubmission['operation']
            const feature = sourceSubmission['feature']
            if (
                !['Create', 'Update', 'Delete'].includes(String(operation)) ||
                !isRecord(feature) ||
                feature['type'] !== 'Feature' ||
                String(feature['id']) !== oldId
            ) {
                throw new Error(
                    'The persisted upload journal submissions are invalid.'
                )
            }
            return {
                oldId,
                operation: operation as PersistedUploadSubmission['operation'],
                feature: structuredClone(feature) as unknown as OsmGoFeature,
            }
        }
    )
    if (
        new Set(submissions.map(({ oldId }) => oldId)).size !==
            submissions.length ||
        submissions.length !== commonBase.submittedIds.length ||
        submissions.some(
            ({ oldId }, index) => oldId !== commonBase.submittedIds[index]
        )
    ) {
        throw new Error('The persisted upload journal submissions are invalid.')
    }
    if (commonBase.summary.Total !== submissions.length) {
        throw new Error('The persisted upload journal summary is invalid.')
    }
    return {
        ...commonBase,
        journalVersion: 2,
        payload,
        submissions,
    }
}

const requireFeatureCollection = (
    value: unknown,
    label: string
): OsmGoFeatureCollection => {
    if (
        !isRecord(value) ||
        value['type'] !== 'FeatureCollection' ||
        !Array.isArray(value['features'])
    ) {
        throw new Error(`The persisted ${label} is not a feature collection.`)
    }
    return structuredClone(value) as unknown as OsmGoFeatureCollection
}

const requireFeatureId = (feature: unknown, label: string): string => {
    if (!isRecord(feature) || feature['type'] !== 'Feature') {
        throw new Error(`The persisted ${label} contains an invalid feature.`)
    }
    const rawId = feature['id']
    if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
        throw new Error(`The persisted ${label} contains a feature without ID.`)
    }
    return String(rawId)
}

const collectionToRecord = (
    collection: OsmGoFeatureCollection,
    label: string
): Record<string, OsmGoFeature> => {
    const featuresById: Record<string, OsmGoFeature> = {}
    for (const sourceFeature of collection.features) {
        const feature = structuredClone(sourceFeature)
        const id = requireFeatureId(feature, label)
        if (featuresById[id]) {
            throw new Error(`The persisted ${label} contains duplicate IDs.`)
        }
        feature.id = id
        featuresById[id] = feature
    }
    return featuresById
}

const requireFeatureRecord = (
    value: unknown,
    label: string
): Record<string, OsmGoFeature> => {
    if (!isRecord(value)) {
        throw new Error(`The persisted ${label} is not an ID record.`)
    }
    const featuresById: Record<string, OsmGoFeature> = {}
    for (const [id, sourceFeature] of Object.entries(value)) {
        const feature = structuredClone(sourceFeature) as OsmGoFeature
        if (requireFeatureId(feature, label) !== id) {
            throw new Error(`The persisted ${label} has an inconsistent ID.`)
        }
        feature.id = id
        featuresById[id] = feature
    }
    return featuresById
}

const normalizeLegacyPendingIds = (
    pendingById: Record<string, OsmGoFeature>
): { pendingById: Record<string, OsmGoFeature>; nextTemporaryId: number } => {
    const negativeIds = Object.values(pendingById)
        .map((feature) => feature.properties?.id)
        .filter((id) => Number.isInteger(id) && id < 0)
    let nextTemporaryId =
        negativeIds.length > 0 ? Math.min(...negativeIds) - 1 : -1
    const normalized: Record<string, OsmGoFeature> = {}

    for (const sourceFeature of Object.values(pendingById)) {
        const feature = structuredClone(sourceFeature)
        let id = String(feature.id)
        if (
            feature.properties?.changeType === 'Create' &&
            (!Number.isInteger(feature.properties.id) ||
                feature.properties.id >= 0)
        ) {
            feature.properties.id = nextTemporaryId--
            id = `${feature.properties.type}/${feature.properties.id}`
            feature.id = id
        }
        if (normalized[id]) {
            throw new Error(
                'The persisted pending data contains duplicate IDs.'
            )
        }
        normalized[id] = feature
    }
    return { pendingById: normalized, nextTemporaryId }
}

export const createEmptyOsmState = (): PersistedOsmStateV2 => ({
    schemaVersion: OSM_STATE_SCHEMA_VERSION,
    revision: 0,
    officialById: {},
    pendingById: {},
    bbox: emptyFeatureCollection(),
    nextTemporaryId: -1,
})

export const migrateLegacyOsmState = (
    legacy: LegacyOsmState
): PersistedOsmStateV2 => {
    const official = requireFeatureCollection(
        legacy.geojson ?? emptyFeatureCollection(),
        'official data'
    )
    const pending = requireFeatureCollection(
        legacy.geojsonChanged ?? emptyFeatureCollection(),
        'pending data'
    )
    const bbox = requireFeatureCollection(
        legacy.geojsonBbox ?? emptyFeatureCollection(),
        'bbox data'
    )
    const normalizedPending = normalizeLegacyPendingIds(
        collectionToRecord(pending, 'pending data')
    )
    return {
        schemaVersion: OSM_STATE_SCHEMA_VERSION,
        revision: 0,
        officialById: collectionToRecord(official, 'official data'),
        pendingById: normalizedPending.pendingById,
        bbox,
        nextTemporaryId: normalizedPending.nextTemporaryId,
    }
}

export const migratePersistedOsmState = (
    value: unknown
): PersistedOsmStateV2 => {
    if (!isRecord(value)) {
        throw new Error('The persisted OSM state is invalid.')
    }
    if (value['schemaVersion'] === 1) {
        const state = value as unknown as PersistedOsmStateV1
        const migrated = migrateLegacyOsmState({
            geojson: state.geojson,
            geojsonChanged: state.geojsonChanged,
            geojsonBbox: state.geojsonBbox,
        })
        migrated.revision =
            Number.isInteger(state.revision) && Number(state.revision) >= 0
                ? Number(state.revision)
                : 0
        if (state.uploadJournal) {
            migrated.uploadJournal = requireUploadJournal(state.uploadJournal)
        }
        return migrated
    }
    if (value['schemaVersion'] !== OSM_STATE_SCHEMA_VERSION) {
        throw new Error('The persisted OSM state version is not supported.')
    }

    const revision = value['revision']
    const nextTemporaryId = value['nextTemporaryId']
    if (!Number.isInteger(revision) || Number(revision) < 0) {
        throw new Error('The persisted OSM state revision is invalid.')
    }
    if (!Number.isInteger(nextTemporaryId) || Number(nextTemporaryId) >= 0) {
        throw new Error('The persisted temporary ID allocator is invalid.')
    }
    const state: PersistedOsmStateV2 = {
        schemaVersion: OSM_STATE_SCHEMA_VERSION,
        revision: Number(revision),
        officialById: requireFeatureRecord(
            value['officialById'],
            'official data'
        ),
        pendingById: requireFeatureRecord(value['pendingById'], 'pending data'),
        bbox: requireFeatureCollection(value['bbox'], 'bbox data'),
        nextTemporaryId: Number(nextTemporaryId),
    }
    if (value['uploadJournal'] !== undefined) {
        state.uploadJournal = requireUploadJournal(value['uploadJournal'])
    }
    return state
}
