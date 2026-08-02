import type { OsmGoFeature, OsmGoFeatureCollection } from '@osmgo/type'

export const OSM_STATE_STORAGE_KEY = 'osmState'
export const OSM_STATE_SCHEMA_VERSION = 2

export interface PersistedUploadJournal {
    readonly [key: string]: unknown
}

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
            migrated.uploadJournal = structuredClone(state.uploadJournal)
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
    if (isRecord(value['uploadJournal'])) {
        state.uploadJournal = structuredClone(value['uploadJournal'])
    }
    return state
}
