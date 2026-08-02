import { computed, inject, Service, signal } from '@angular/core'
import {
    FeatureIdSource,
    OsmGoFeature,
    OsmGoFeatureCollection,
} from '@osmgo/type'
import { AppStorage } from '@services/app-storage.service'
import {
    migrateLegacyOsmState,
    migratePersistedOsmState,
    OSM_STATE_SCHEMA_VERSION,
    OSM_STATE_STORAGE_KEY,
    OsmStatePersistenceError,
    type PersistedOsmStateV2,
    type PersistedUploadJournal,
} from '@services/osm-state'
import { featureCollection } from '@turf/turf'
import { cloneDeep } from 'lodash'
import { from, Observable } from 'rxjs'
import { map } from 'rxjs/operators'

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

    geojsonWay: OsmGoFeatureCollection = featureCollection(
        []
    ) as OsmGoFeatureCollection
    geojsonBbox: OsmGoFeatureCollection = featureCollection(
        []
    ) as OsmGoFeatureCollection

    /** Next unused ID that can be used for a new feature. */
    private _nextFeatureId = -1
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
        const fc = featureCollection([]) as OsmGoFeatureCollection
        fc.features = Object.values(this._geojson)
        return fc
    }

    /**
     * Getter that translates the internal storage representation of
     * self-created or modified POIs into a geojson feature collection.
     *
     * Data source is the `_geojsonChanged` member variable.
     */
    get geojsonChanged(): OsmGoFeatureCollection {
        const fc = featureCollection([]) as OsmGoFeatureCollection
        fc.features = Object.values(this._geojsonChanged)
        return fc
    }

    addIconCache(idIcon: string, uri: string): void {
        this.localStorage.set(idIcon, uri)
    }

    getIconCache(idIcon: string): Promise<unknown> {
        return this.localStorage.get(idIcon)
    }

    loadGeojson$(): Observable<OsmGoFeatureCollection> {
        return from(this.localStorage.get('geojson')).pipe(
            map((geojson: OsmGoFeatureCollection | null | undefined) => {
                geojson = geojson
                    ? geojson
                    : (featureCollection([]) as OsmGoFeatureCollection)
                const loadedFeatures: Record<string, OsmGoFeature> = {}
                for (const feature of geojson.features) {
                    loadedFeatures[this.requireFeatureId(feature)] = feature
                }
                this._geojson = loadedFeatures
                return geojson
            })
        )
    }

    loadGeojsonChanged$(): Observable<OsmGoFeatureCollection> {
        return from(this.localStorage.get('geojsonChanged')).pipe(
            map((geojson: OsmGoFeatureCollection | null | undefined) => {
                geojson = geojson
                    ? geojson
                    : (featureCollection([]) as OsmGoFeatureCollection)
                const loadedFeatures: Record<string, OsmGoFeature> = {}
                for (const feature of geojson.features) {
                    loadedFeatures[this.requireFeatureId(feature)] = feature
                }
                this._geojsonChanged = loadedFeatures

                // At this point we know previously created elements from which we can determine the min ID.
                this.forceNextFeatureIdSync()
                this.notifyChangedData()

                return geojson
            })
        )
    }

    loadGeojsonBbox$(): Observable<OsmGoFeatureCollection> {
        return from(this.localStorage.get('geojsonBbox')).pipe(
            map((geojson: OsmGoFeatureCollection | null | undefined) => {
                geojson = geojson
                    ? geojson
                    : (featureCollection([]) as OsmGoFeatureCollection)
                this.geojsonBbox = geojson
                return geojson
            })
        )
    }

    loadOsmState$(): Observable<PersistedOsmStateV2> {
        return from(this.loadPersistedOsmState()).pipe(
            map((state) => {
                this._geojson = cloneDeep(state.officialById)
                this._geojsonChanged = cloneDeep(state.pendingById)
                this.geojsonBbox = cloneDeep(state.bbox)
                this._nextFeatureId = state.nextTemporaryId
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
            const state = migratePersistedOsmState(persisted)
            if (
                typeof persisted === 'object' &&
                persisted !== null &&
                (persisted as { schemaVersion?: unknown }).schemaVersion !==
                    OSM_STATE_SCHEMA_VERSION
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
        try {
            await this.localStorage.clear()
        } catch (error) {
            console.error(error)
        }

        try {
            window.indexedDB.deleteDatabase('_ionickv')
        } catch (error) {
            console.log(error)
        }
        localStorage.clear()
    }

    setGeojsonBbox(geojsonBbox: OsmGoFeatureCollection): Promise<void> {
        const bbox = cloneDeep(geojsonBbox)
        return this.enqueueOsmStateMutation('set bbox', (state) => {
            state.bbox = bbox
        })
    }
    getGeojsonBbox(): OsmGoFeatureCollection {
        return this.geojsonBbox
    }

    async resetGeojsonBbox(): Promise<OsmGoFeatureCollection> {
        const fc = featureCollection([]) as OsmGoFeatureCollection
        await this.setGeojsonBbox(fc)
        return fc
    }

    setGeojsonWay(data: OsmGoFeatureCollection): void {
        this.geojsonWay = cloneDeep(data)
    }

    addFeatureToGeojsonWay(feature: OsmGoFeature): void {
        this.geojsonWay.features.push(feature)
    }

    getGeojson(): OsmGoFeatureCollection {
        if (this.geojson) {
            return this.geojson
        } else {
            return featureCollection([]) as OsmGoFeatureCollection
        }
    }

    setGeojson(data: OsmGoFeatureCollection): Promise<void> {
        const nextGeojson: Record<string, OsmGoFeature> = {}
        for (const feature of data.features) {
            nextGeojson[this.requireFeatureId(feature)] = cloneDeep(feature)
        }
        return this.enqueueOsmStateMutation('set official data', (state) => {
            state.officialById = nextGeojson
        })
    }

    addFeatureToGeojson(feature: OsmGoFeature): Promise<void> {
        const id = this.requireFeatureId(feature)
        const snapshot = cloneDeep(feature)
        return this.enqueueOsmStateMutation('add official feature', (state) => {
            state.officialById[id] = snapshot
        })
    }

    updateFeatureToGeojson(feature: OsmGoFeature): Promise<void> {
        const id = this.requireFeatureId(feature)
        const snapshot = cloneDeep(feature)
        return this.enqueueOsmStateMutation(
            'update official feature',
            (state) => {
                state.officialById[id] = snapshot
            }
        )
    }

    deleteFeatureFromGeojson(feature: OsmGoFeature): Promise<void> {
        const id = this.requireFeatureId(feature)
        return this.enqueueOsmStateMutation(
            'delete official feature',
            (state) => {
                delete state.officialById[id]
            }
        )
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
        const features =
            source === 'data_changed'
                ? this.getGeojsonChanged().features
                : this.getGeojson().features

        const feature = features.find((f) => f.id === id)
        if (feature) {
            return cloneDeep(feature)
        } else {
            return undefined
        }
    }

    /**
     * Retrieve a geojson feature collection of all changed
     * (created/modified/deleted) elements.
     *
     * @returns A deep copy of the geojson feature collection of all changed
     * elements.
     */
    getGeojsonChanged(): OsmGoFeatureCollection {
        return cloneDeep(this.geojsonChanged)
    }

    /** Returns the next available identifier for a feature (auto-incremented). */
    get nextFeatureId(): number {
        return this._nextFeatureId--
    }

    /**
     * Synchronizes the next feature ID by looping through all existing changes
     * and identifying the lowest ID.
     * Looping through all entries is slow. Use this method only if really
     * needed, e.g., if a new feature collection is set from outside the
     * service.
     */
    private forceNextFeatureIdSync(): void {
        const ids = Object.values(this._geojsonChanged)
            .map((feature) => feature.properties.id)
            .filter((id) => Number.isInteger(id) && id < 0)
        this._nextFeatureId = ids.length > 0 ? Math.min(...ids) - 1 : -1
    }

    private notifyChangedData(): void {
        this.changedDataRevisionState.update((revision) => revision + 1)
    }

    async setGeojsonChanged(data: OsmGoFeatureCollection): Promise<void> {
        const nextGeojsonChanged: Record<string, OsmGoFeature> = {}
        for (const feature of data.features) {
            nextGeojsonChanged[this.requireFeatureId(feature)] =
                cloneDeep(feature)
        }
        await this.enqueueOsmStateMutation('set pending data', (state) => {
            state.pendingById = nextGeojsonChanged
            state.nextTemporaryId = this.getNextTemporaryId(nextGeojsonChanged)
        })
    }

    // Replace IDs generated by version 1.5 and earlier with numeric IDs.
    async replaceIdGenerateByOldVersion(): Promise<void> {
        await this.enqueueOsmStateMutation(
            'migrate pending feature IDs',
            (state) => {
                for (const [id, sourceFeature] of Object.entries(
                    state.pendingById
                )) {
                    if (
                        sourceFeature.properties.changeType === 'Create' &&
                        (!Number.isInteger(sourceFeature.properties.id) ||
                            sourceFeature.properties.id >= 0)
                    ) {
                        const feature = cloneDeep(sourceFeature)
                        const nextId = state.nextTemporaryId--
                        feature.properties.id = nextId
                        feature.id = `${feature.properties.type}/${nextId}`
                        console.info('Fixed legacy feature ID:', feature.id)

                        state.pendingById[this.requireFeatureId(feature)] =
                            feature
                        delete state.pendingById[id]
                    }
                }
            }
        )
    }

    getCountGeojsonChanged(): number {
        if (this.getGeojsonChanged().features) {
            return this.getGeojsonChanged().features.length
        } else {
            return 0
        }
    }

    addFeatureToGeojsonChanged(feature: OsmGoFeature): Promise<void> {
        const id = this.requireFeatureId(feature)
        const snapshot = cloneDeep(feature)
        return this.enqueueOsmStateMutation('add pending feature', (state) => {
            state.pendingById[id] = snapshot
            state.nextTemporaryId = Math.min(
                state.nextTemporaryId,
                this._nextFeatureId
            )
        })
    }

    updateFeatureToGeojsonChanged(feature: OsmGoFeature): Promise<void> {
        const id = this.requireFeatureId(feature)
        const snapshot = cloneDeep(feature)
        return this.enqueueOsmStateMutation(
            'update pending feature',
            (state) => {
                state.pendingById[id] = snapshot
            }
        )
    }

    deleteFeatureFromGeojsonChanged(feature: OsmGoFeature): Promise<void> {
        const id = this.requireFeatureId(feature)
        return this.enqueueOsmStateMutation(
            'delete pending feature',
            (state) => {
                delete state.pendingById[id]
            }
        )
    }

    async applyUploadResults(
        results: Array<{ oldId: string; feature?: OsmGoFeature }>
    ): Promise<void> {
        await this.enqueueOsmStateMutation('apply upload results', (state) => {
            const oldIds = results.map((result) => result.oldId)
            if (
                new Set(oldIds).size !== oldIds.length ||
                oldIds.some((id) => !state.pendingById[id])
            ) {
                throw new Error(
                    'The OSM upload result does not match local data.'
                )
            }

            for (const result of results) {
                delete state.pendingById[result.oldId]
                delete state.officialById[result.oldId]
                if (result.feature) {
                    state.officialById[this.requireFeatureId(result.feature)] =
                        cloneDeep(result.feature)
                }
            }
        })
    }

    getMergedGeojsonGeojsonChanged(): OsmGoFeatureCollection {
        const changedIds = Object.keys(this._geojsonChanged)
        for (const id of changedIds) {
            delete this._geojson[id]
        }
        for (const feature of Object.values(this._geojsonChanged)) {
            this._geojson[this.requireFeatureId(feature)] = feature
        }
        return cloneDeep(this.geojson)
    }

    cancelFeatureChange(feature: OsmGoFeature): Promise<void> {
        const originalFeature = cloneDeep(feature.properties.originalData)
        if (feature.properties.changeType !== 'Create' && !originalFeature) {
            throw new Error('The original feature data is missing.')
        }
        const id = this.requireFeatureId(feature)
        return this.enqueueOsmStateMutation(
            'cancel pending change',
            (state) => {
                delete state.pendingById[id]
                if (
                    feature.properties.changeType !== 'Create' &&
                    originalFeature
                ) {
                    state.officialById[this.requireFeatureId(originalFeature)] =
                        originalFeature
                }
            }
        )
    }

    async resetGeojsonChanged(): Promise<void> {
        await this.enqueueOsmStateMutation('reset pending data', (state) => {
            state.pendingById = {}
            state.nextTemporaryId = -1
        })
    }

    async resetGeojsonData(): Promise<OsmGoFeatureCollection> {
        const fc = featureCollection([]) as OsmGoFeatureCollection
        await this.setGeojson(fc)
        return fc
    }

    private requireFeatureId(feature: OsmGoFeature): string {
        if (feature.id === undefined || feature.id === null) {
            throw new Error('A feature ID is required.')
        }
        return String(feature.id)
    }

    private createOsmStateSnapshot(): PersistedOsmStateV2 {
        return {
            schemaVersion: OSM_STATE_SCHEMA_VERSION,
            revision: this._osmStateRevision + 1,
            officialById: cloneDeep(this._geojson),
            pendingById: cloneDeep(this._geojsonChanged),
            bbox: cloneDeep(this.geojsonBbox),
            nextTemporaryId: this._nextFeatureId,
            ...(this._uploadJournal
                ? { uploadJournal: cloneDeep(this._uploadJournal) }
                : {}),
        }
    }

    private enqueueOsmStateMutation(
        operation: string,
        mutate: (state: PersistedOsmStateV2) => void
    ): Promise<void> {
        const mutation = this.osmStateMutationQueue.then(async () => {
            const state = this.createOsmStateSnapshot()
            mutate(state)
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
        })
        this.osmStateMutationQueue = mutation.catch(() => undefined)
        return mutation
    }

    private publishOsmState(state: PersistedOsmStateV2): void {
        this._geojson = cloneDeep(state.officialById)
        this._geojsonChanged = cloneDeep(state.pendingById)
        this.geojsonBbox = cloneDeep(state.bbox)
        this._nextFeatureId = state.nextTemporaryId
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
