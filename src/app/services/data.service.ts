import { computed, inject, Service, signal } from '@angular/core'
import { cloneDeep } from '@app/utils/clone'
import {
    FeatureIdSource,
    OsmGoFeature,
    OsmGoFeatureCollection,
} from '@osmgo/type'
import { AppStorage } from '@services/app-storage.service'
import {
    requireGeometryFeatureCollection,
    requireOsmGoFeature,
    requireOsmGoFeatureCollection,
} from '@services/osm-data-validation'
import {
    migrateLegacyOsmState,
    OSM_STATE_SCHEMA_VERSION,
    OSM_STATE_STORAGE_KEY,
    OsmStatePersistenceError,
    type PersistedOsmStateV2,
    type PersistedUploadJournal,
    recoverPersistedOsmState,
} from '@services/osm-state'
import { featureCollection } from '@turf/helpers'
import { from, Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface OsmDownload {
    geojson: OsmGoFeatureCollection
    geojsonBbox: OsmGoFeatureCollection
}

export interface UploadReceiptEntry {
    oldId: string
    feature?: OsmGoFeature
}

export class UploadQueueLockedError extends Error {
    readonly name = 'UploadQueueLockedError'

    constructor(readonly lockedIds: string[]) {
        super(
            `The upload attempt must be resolved before changing: ${lockedIds.join(', ')}.`
        )
    }
}

@Service()
export class DataService {
    readonly localStorage = inject(AppStorage)

    /**
     * Primary data storage for official OSM POIs.
     * Don't read from this value directly. Instead use the `geojson` member
     * variable.
     *
     * A hashmap is used to have a constant time complexity when looking up
     * entries with a known ID.
     */
    private _geojson: Record<string, OsmGoFeature> = {}

    /**
     * Primary data storage for self-created or modified POIs.
     * Don't read from this value directly. Instead use the `geojsonChanged`
     * member variable.
     *
     * A hashmap is used to have a constant time complexity when looking up
     * entries with a known ID.
     */
    private _geojsonChanged: Record<string, OsmGoFeature> = {}
    private readonly changedDataRevisionState = signal(0)
    readonly changedFeatureCount = computed(() => {
        this.changedDataRevisionState()
        return Object.keys(this._geojsonChanged).length
    })

    private _geojsonBbox: OsmGoFeatureCollection = featureCollection(
        []
    ) as OsmGoFeatureCollection

    /** Next unused ID that can be used for a new feature. */
    private _nextTemporaryId = -1
    private _osmStateRevision = 0
    private _uploadJournal?: PersistedUploadJournal
    private osmStateMutationQueue: Promise<void> = Promise.resolve()

    /**
     * Getter that translates the internal storage representation of OSM POIs
     * into a geojson feature collection.
     *
     * Data source is the `_geojson` member variable.
     */
    get geojson(): OsmGoFeatureCollection {
        return featureCollection(
            Object.values(this._geojson).map((feature) => cloneDeep(feature))
        ) as OsmGoFeatureCollection
    }

    /**
     * Getter that translates the internal storage representation of
     * self-created or modified POIs into a geojson feature collection.
     *
     * Data source is the `_geojsonChanged` member variable.
     */
    get geojsonChanged(): OsmGoFeatureCollection {
        return featureCollection(
            Object.values(this._geojsonChanged).map((feature) =>
                cloneDeep(feature)
            )
        ) as OsmGoFeatureCollection
    }

    addIconCache(idIcon: string, uri: string): void {
        this.localStorage.set(idIcon, uri)
    }

    getIconCache(idIcon: string): Promise<unknown> {
        return this.localStorage.get(idIcon)
    }

    loadOsmState$(): Observable<PersistedOsmStateV2> {
        return from(this.loadPersistedOsmState()).pipe(
            map((state) => {
                this._geojson = cloneDeep(state.officialById)
                this._geojsonChanged = cloneDeep(state.pendingById)
                this._geojsonBbox = cloneDeep(state.bbox)
                this._nextTemporaryId = state.nextTemporaryId
                this._osmStateRevision = state.revision
                this._uploadJournal = cloneDeep(state.uploadJournal)
                this.notifyChangedData()
                return cloneDeep(state)
            })
        )
    }

    private async loadPersistedOsmState(): Promise<PersistedOsmStateV2> {
        const persisted = await this.localStorage.get(OSM_STATE_STORAGE_KEY)
        if (persisted !== null && persisted !== undefined) {
            const { state, quarantined } = recoverPersistedOsmState(persisted)
            if (quarantined.length > 0) {
                await this.localStorage.set('osmStateQuarantinedFeatures', {
                    quarantinedAt: new Date().toISOString(),
                    sourceRevision:
                        typeof persisted === 'object' && persisted !== null
                            ? ((persisted as { revision?: unknown }).revision ??
                              null)
                            : null,
                    features: quarantined,
                })
            }
            if (
                quarantined.length > 0 ||
                (typeof persisted === 'object' &&
                    persisted !== null &&
                    (persisted as { schemaVersion?: unknown }).schemaVersion !==
                        OSM_STATE_SCHEMA_VERSION)
            ) {
                await this.localStorage.set(OSM_STATE_STORAGE_KEY, state)
            }
            return state
        }

        const [geojson, geojsonChanged, geojsonBbox] = await Promise.all([
            this.localStorage.get<OsmGoFeatureCollection>('geojson'),
            this.localStorage.get<OsmGoFeatureCollection>('geojsonChanged'),
            this.localStorage.get<OsmGoFeatureCollection>('geojsonBbox'),
        ])
        const state = migrateLegacyOsmState({
            geojson,
            geojsonChanged,
            geojsonBbox,
        })
        await this.localStorage.set(OSM_STATE_STORAGE_KEY, state)
        await Promise.all([
            this.localStorage.remove('geojson'),
            this.localStorage.remove('geojsonChanged'),
            this.localStorage.remove('geojsonBbox'),
        ])
        return state
    }

    async getKeysCacheIcon(): Promise<string[]> {
        const allKeys: string[] = await this.localStorage.keys()
        return allKeys.filter(
            (k) => /^circle/.test(k) || /^square/.test(k) || /^penta/.test(k)
        )
    }

    async clearIconCache(): Promise<number> {
        const keys: string[] = await this.getKeysCacheIcon()
        let n: number = 0
        for (const key of keys) {
            await this.localStorage.remove(key)
            n++
        }
        return n
    }

    async clearCache(): Promise<void> {
        await this.localStorage.clear()
        localStorage.clear()
    }

    getGeojsonBbox(): OsmGoFeatureCollection {
        return cloneDeep(this._geojsonBbox)
    }

    getGeojson(): OsmGoFeatureCollection {
        return this.geojson
    }

    applyDownload(download: OsmDownload): Promise<void> {
        const validatedGeojson = requireOsmGoFeatureCollection(
            download.geojson,
            'downloaded OSM data',
            'official'
        )
        const officialById = this.collectionToRecord(
            validatedGeojson,
            'downloaded feature',
            true
        )
        const bbox = requireGeometryFeatureCollection(
            download.geojsonBbox,
            'downloaded bbox data'
        )
        return this.enqueueOsmStateMutation('apply download', (state) => {
            state.officialById = Object.fromEntries(
                Object.entries(officialById).filter(
                    ([id]) => !state.pendingById[id]
                )
            )
            state.bbox = bbox
        })
    }

    /**
     * Looks up a feature with a given ID.
     *
     * If the source is `data`, the original OSM geojson features are searched
     * through, otherwise the local modified features are used for the lookup.
     *
     * @returns A deep copy of the feature if found, otherwise `undefined`.
     */
    getFeatureById(
        id: string,
        source: FeatureIdSource
    ): OsmGoFeature | undefined {
        const feature =
            source === 'data_changed'
                ? this._geojsonChanged[id]
                : this._geojson[id]
        return feature ? cloneDeep(feature) : undefined
    }

    /**
     * Retrieve a geojson feature collection of all changed
     * (created/modified/deleted) elements.
     *
     * @returns A deep copy of the geojson feature collection of all changed
     * elements.
     */
    getGeojsonChanged(): OsmGoFeatureCollection {
        return this.geojsonChanged
    }

    private notifyChangedData(): void {
        this.changedDataRevisionState.update((revision) => revision + 1)
    }

    async replacePendingFeatures(data: OsmGoFeatureCollection): Promise<void> {
        const validatedData = requireOsmGoFeatureCollection(
            data,
            'replacement pending data',
            'pending'
        )
        const nextGeojsonChanged = this.collectionToRecord(
            validatedData,
            'pending feature'
        )
        await this.enqueueOsmStateMutation('replace pending data', (state) => {
            this.assertUploadQueueUnlocked(
                state,
                Object.keys(state.pendingById)
            )
            state.pendingById = nextGeojsonChanged
            state.nextTemporaryId = this.getNextTemporaryId(nextGeojsonChanged)
        })
    }

    createPendingFeature(input: OsmGoFeature): Promise<OsmGoFeature> {
        const feature = cloneDeep(input)
        return this.enqueueOsmStateMutation(
            'create pending feature',
            (state) => {
                const temporaryId = state.nextTemporaryId
                if (!Number.isInteger(temporaryId) || temporaryId >= 0) {
                    throw new Error('The temporary ID allocator is invalid.')
                }
                const type = feature.properties.type
                if (type !== 'node' || feature.geometry.type !== 'Point') {
                    throw new Error('Only OSM nodes can be created locally.')
                }

                feature.id = `${type}/${temporaryId}`
                feature.properties.id = temporaryId
                feature.properties.changeType = 'Create'
                feature.properties.originalData = null
                feature.properties.meta.version = 0
                const validated = requireOsmGoFeature(
                    feature,
                    'created pending feature',
                    'pending'
                )
                state.pendingById[this.requireFeatureId(validated)] = validated
                state.nextTemporaryId = temporaryId - 1
                return cloneDeep(validated)
            }
        )
    }

    moveOfficialToPending(
        id: string,
        patch: OsmGoFeature
    ): Promise<OsmGoFeature> {
        const changedFeature = cloneDeep(patch)
        return this.enqueueOsmStateMutation(
            'move official feature to pending',
            (state) => {
                this.assertUploadQueueUnlocked(state, [id])
                const original = state.officialById[id]
                if (!original) {
                    throw new Error('The original feature data is missing.')
                }
                this.copyCanonicalIdentity(changedFeature, original)
                changedFeature.properties.changeType = 'Update'
                changedFeature.properties.originalData = cloneDeep(original)
                delete state.officialById[id]
                const validated = requireOsmGoFeature(
                    changedFeature,
                    'updated pending feature',
                    'pending'
                )
                state.pendingById[id] = validated
                return cloneDeep(validated)
            }
        )
    }

    updatePendingFeature(
        id: string,
        patch: OsmGoFeature
    ): Promise<OsmGoFeature> {
        const changedFeature = cloneDeep(patch)
        return this.enqueueOsmStateMutation(
            'update pending feature',
            (state) => {
                this.assertUploadQueueUnlocked(state, [id])
                const current = state.pendingById[id]
                if (!current) {
                    throw new Error('The pending feature data is missing.')
                }
                this.copyCanonicalIdentity(changedFeature, current)
                changedFeature.properties.changeType =
                    current.properties.changeType
                changedFeature.properties.originalData = cloneDeep(
                    current.properties.originalData
                )
                const validated = requireOsmGoFeature(
                    changedFeature,
                    'updated pending feature',
                    'pending'
                )
                state.pendingById[id] = validated
                return cloneDeep(validated)
            }
        )
    }

    markPendingDeleted(id: string): Promise<OsmGoFeature | undefined> {
        return this.enqueueOsmStateMutation(
            'mark pending feature deleted',
            (state) => {
                this.assertUploadQueueUnlocked(state, [id])
                const pending = state.pendingById[id]
                if (pending?.properties.changeType === 'Create') {
                    delete state.pendingById[id]
                    return undefined
                }

                const official = state.officialById[id]
                const source = pending ?? official
                if (!source) {
                    throw new Error('The feature data is missing.')
                }
                const original = pending
                    ? this.requireOriginalFeature(pending)
                    : cloneDeep(official)
                if (!original) {
                    throw new Error('The original feature data is missing.')
                }

                const deletedFeature = cloneDeep(source)
                this.copyCanonicalIdentity(deletedFeature, original)
                deletedFeature.properties.changeType = 'Delete'
                deletedFeature.properties.originalData = cloneDeep(original)
                delete state.officialById[id]
                const validated = requireOsmGoFeature(
                    deletedFeature,
                    'deleted pending feature',
                    'pending'
                )
                state.pendingById[id] = validated
                return cloneDeep(validated)
            }
        )
    }

    cancelPendingChange(id: string): Promise<void> {
        return this.enqueueOsmStateMutation(
            'cancel pending change',
            (state) => {
                this.assertUploadQueueUnlocked(state, [id])
                const pending = state.pendingById[id]
                if (!pending) {
                    throw new Error('The pending feature data is missing.')
                }
                if (pending.properties.changeType !== 'Create') {
                    const original = this.requireOriginalFeature(pending)
                    state.officialById[id] = original
                }
                delete state.pendingById[id]
            }
        )
    }

    cancelAllPendingChanges(): Promise<void> {
        return this.enqueueOsmStateMutation(
            'cancel all pending changes',
            (state) => {
                this.assertUploadQueueUnlocked(
                    state,
                    Object.keys(state.pendingById)
                )
                for (const [id, pending] of Object.entries(state.pendingById)) {
                    if (pending.properties.changeType !== 'Create') {
                        state.officialById[id] =
                            this.requireOriginalFeature(pending)
                    }
                }
                state.pendingById = {}
                state.nextTemporaryId = -1
            }
        )
    }

    async applyUploadReceipt(results: UploadReceiptEntry[]): Promise<void> {
        const receipt = cloneDeep(results)
        for (const result of receipt) {
            if (result.feature) {
                result.feature = requireOsmGoFeature(
                    result.feature,
                    'uploaded official feature',
                    'official'
                )
            }
        }
        await this.enqueueOsmStateMutation('apply upload receipt', (state) => {
            this.applyReceiptToState(state, receipt)
        })
    }

    getUploadJournal(): PersistedUploadJournal | undefined {
        return this._uploadJournal ? cloneDeep(this._uploadJournal) : undefined
    }

    beginUploadAttempt(
        journal: Extract<PersistedUploadJournal, { phase: 'prepared' }>
    ): Promise<void> {
        const prepared = cloneDeep(journal)
        return this.enqueueOsmStateMutation('begin upload attempt', (state) => {
            if (state.uploadJournal) {
                throw new Error('An upload journal is already active.')
            }
            state.uploadJournal = prepared
        })
    }

    acknowledgeUploadAttempt(
        attemptId: string,
        rawReceipt: unknown,
        acknowledgedAt: string
    ): Promise<void> {
        const receipt = cloneDeep(rawReceipt)
        return this.enqueueOsmStateMutation(
            'acknowledge upload attempt',
            (state) => {
                const journal = state.uploadJournal
                if (
                    journal?.attemptId !== attemptId ||
                    journal.phase !== 'prepared'
                ) {
                    throw new Error('The active upload journal is invalid.')
                }
                state.uploadJournal = {
                    ...journal,
                    phase: 'acknowledged',
                    rawReceipt: receipt,
                    acknowledgedAt,
                }
            }
        )
    }

    applyAcknowledgedUploadReceipt(
        attemptId: string,
        results: UploadReceiptEntry[],
        appliedAt: string
    ): Promise<void> {
        const receipt = cloneDeep(results)
        for (const result of receipt) {
            if (result.feature) {
                result.feature = requireOsmGoFeature(
                    result.feature,
                    'uploaded official feature',
                    'official'
                )
            }
        }
        return this.enqueueOsmStateMutation(
            'apply acknowledged upload receipt',
            (state) => {
                const journal = state.uploadJournal
                if (
                    journal?.attemptId !== attemptId ||
                    journal.phase !== 'acknowledged'
                ) {
                    throw new Error(
                        'The acknowledged upload journal is invalid.'
                    )
                }
                this.applyReceiptToState(state, receipt)
                state.uploadJournal = {
                    ...journal,
                    phase: 'applied',
                    appliedAt,
                }
            }
        )
    }

    clearAppliedUploadAttempt(attemptId: string): Promise<void> {
        return this.enqueueOsmStateMutation(
            'clear applied upload attempt',
            (state) => {
                const journal = state.uploadJournal
                if (
                    journal?.attemptId !== attemptId ||
                    journal.phase !== 'applied'
                ) {
                    throw new Error('The applied upload journal is invalid.')
                }
                delete state.uploadJournal
            }
        )
    }

    discardPreparedUploadAttempt(attemptId: string): Promise<void> {
        return this.enqueueOsmStateMutation(
            'discard rejected upload attempt',
            (state) => {
                const journal = state.uploadJournal
                if (
                    journal?.attemptId !== attemptId ||
                    journal.phase !== 'prepared'
                ) {
                    throw new Error('The prepared upload journal is invalid.')
                }
                delete state.uploadJournal
            }
        )
    }

    resetDownloadedData(): Promise<OsmDownload> {
        return this.enqueueOsmStateMutation(
            'reset downloaded data',
            (state) => {
                const emptyGeojson = featureCollection(
                    []
                ) as OsmGoFeatureCollection
                const emptyBbox = featureCollection(
                    []
                ) as OsmGoFeatureCollection
                state.officialById = {}
                state.bbox = emptyBbox
                return { geojson: emptyGeojson, geojsonBbox: emptyBbox }
            }
        )
    }

    resetAllData(): Promise<void> {
        return this.enqueueOsmStateMutation('reset all OSM data', (state) => {
            state.officialById = {}
            state.pendingById = {}
            state.bbox = featureCollection([]) as OsmGoFeatureCollection
            state.nextTemporaryId = -1
            delete state.uploadJournal
        })
    }

    private requireFeatureId(feature: OsmGoFeature): string {
        if (feature.id === undefined || feature.id === null) {
            throw new Error('A feature ID is required.')
        }
        return String(feature.id)
    }

    private applyReceiptToState(
        state: PersistedOsmStateV2,
        receipt: UploadReceiptEntry[]
    ): void {
        const oldIds = receipt.map((result) => result.oldId)
        if (
            new Set(oldIds).size !== oldIds.length ||
            oldIds.some((id) => !state.pendingById[id])
        ) {
            throw new Error('The OSM upload result does not match local data.')
        }

        for (const result of receipt) {
            delete state.pendingById[result.oldId]
            delete state.officialById[result.oldId]
            if (result.feature) {
                state.officialById[this.requireFeatureId(result.feature)] =
                    cloneDeep(result.feature)
            }
        }
    }

    private assertUploadQueueUnlocked(
        state: PersistedOsmStateV2,
        candidateIds: string[]
    ): void {
        const submittedIds = new Set(state.uploadJournal?.submittedIds ?? [])
        const lockedIds = candidateIds.filter((id) => submittedIds.has(id))
        if (lockedIds.length > 0) {
            throw new UploadQueueLockedError(lockedIds)
        }
    }

    private collectionToRecord(
        collection: OsmGoFeatureCollection,
        label: string,
        requireCanonicalIdentity = false
    ): Record<string, OsmGoFeature> {
        const featuresById: Record<string, OsmGoFeature> = {}
        for (const sourceFeature of collection.features) {
            const feature = cloneDeep(sourceFeature)
            const id = requireCanonicalIdentity
                ? this.requireCanonicalFeatureId(feature)
                : this.requireFeatureId(feature)
            if (featuresById[id]) {
                throw new Error(`The ${label} collection has duplicate IDs.`)
            }
            featuresById[id] = feature
        }
        return featuresById
    }

    /** A persisted feature key is always the canonical `type/id` pair. */
    private requireCanonicalFeatureId(feature: OsmGoFeature): string {
        const id = this.requireFeatureId(feature)
        const objectId = feature.properties.id
        const type = feature.properties.type
        if (
            !['node', 'way', 'relation'].includes(type) ||
            !Number.isInteger(objectId) ||
            id !== `${type}/${objectId}`
        ) {
            throw new Error('The feature has an inconsistent canonical ID.')
        }
        return id
    }

    private copyCanonicalIdentity(
        target: OsmGoFeature,
        source: OsmGoFeature
    ): void {
        target.id = this.requireFeatureId(source)
        target.properties.id = source.properties.id
        target.properties.type = source.properties.type
    }

    private requireOriginalFeature(feature: OsmGoFeature): OsmGoFeature {
        const original = feature.properties.originalData
        if (!original) {
            throw new Error('The original feature data is missing.')
        }
        return cloneDeep(original)
    }

    private createOsmStateSnapshot(): PersistedOsmStateV2 {
        return {
            schemaVersion: OSM_STATE_SCHEMA_VERSION,
            revision: this._osmStateRevision + 1,
            officialById: cloneDeep(this._geojson),
            pendingById: cloneDeep(this._geojsonChanged),
            bbox: cloneDeep(this._geojsonBbox),
            nextTemporaryId: this._nextTemporaryId,
            ...(this._uploadJournal
                ? { uploadJournal: cloneDeep(this._uploadJournal) }
                : {}),
        }
    }

    private enqueueOsmStateMutation<Result>(
        operation: string,
        mutate: (state: PersistedOsmStateV2) => Result
    ): Promise<Result> {
        const mutation = this.osmStateMutationQueue.then(async () => {
            const state = this.createOsmStateSnapshot()
            const result = mutate(state)
            try {
                await this.localStorage.set(
                    OSM_STATE_STORAGE_KEY,
                    cloneDeep(state)
                )
            } catch (cause) {
                throw new OsmStatePersistenceError(operation, state.revision, {
                    cause,
                })
            }
            this.publishOsmState(state)
            return result
        })
        this.osmStateMutationQueue = mutation.then(
            () => undefined,
            () => undefined
        )
        return mutation
    }

    private publishOsmState(state: PersistedOsmStateV2): void {
        this._geojson = cloneDeep(state.officialById)
        this._geojsonChanged = cloneDeep(state.pendingById)
        this._geojsonBbox = cloneDeep(state.bbox)
        this._nextTemporaryId = state.nextTemporaryId
        this._osmStateRevision = state.revision
        this._uploadJournal = cloneDeep(state.uploadJournal)
        this.notifyChangedData()
    }

    private getNextTemporaryId(
        featuresById: Record<string, OsmGoFeature>
    ): number {
        const ids = Object.values(featuresById)
            .map((feature) => feature.properties.id)
            .filter((id) => Number.isInteger(id) && id < 0)
        return ids.length > 0 ? Math.min(...ids) - 1 : -1
    }
}
