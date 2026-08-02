import { computed, inject, Service, signal } from '@angular/core'
import {
    FeatureIdSource,
    OsmGoFeature,
    OsmGoFeatureCollection,
} from '@osmgo/type'
import { AppStorage } from '@services/app-storage.service'
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
    private _nextFeatureId = 0

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

    setGeojsonBbox(geojsonBbox: OsmGoFeatureCollection): void {
        this.geojsonBbox = geojsonBbox
        this.localStorage.set('geojsonBbox', this.geojsonBbox)
    }
    getGeojsonBbox(): OsmGoFeatureCollection {
        return this.geojsonBbox
    }

    resetGeojsonBbox(): OsmGoFeatureCollection {
        const fc = featureCollection([]) as OsmGoFeatureCollection
        this.setGeojsonBbox(fc)
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

    setGeojson(data: OsmGoFeatureCollection): void {
        const nextGeojson: Record<string, OsmGoFeature> = {}
        for (const feature of data.features) {
            nextGeojson[this.requireFeatureId(feature)] = cloneDeep(feature)
        }
        this._geojson = nextGeojson
        this.localStorage.set('geojson', this.geojson)
    }

    addFeatureToGeojson(feature: OsmGoFeature): void {
        this._geojson[this.requireFeatureId(feature)] = feature
        this.setGeojson(this.geojson)
    }

    updateFeatureToGeojson(feature: OsmGoFeature): void {
        this._geojson[this.requireFeatureId(feature)] = feature
        this.setGeojson(this.geojson)
    }

    deleteFeatureFromGeojson(feature: OsmGoFeature): void {
        delete this._geojson[this.requireFeatureId(feature)]
        this.setGeojson(this.geojson)
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
            // in the new format only non-positive values are allowed, skip all
            // others
            .filter((id) => id <= 0)
        this._nextFeatureId = ids.length > 0 ? Math.min(...ids) - 1 : 0
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
        this._geojsonChanged = nextGeojsonChanged
        this.notifyChangedData()
        await this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    // Replace IDs generated by version 1.5 and earlier with numeric IDs.
    async replaceIdGenerateByOldVersion(): Promise<void> {
        for (const [id, feature] of Object.entries(this._geojsonChanged)) {
            if (
                feature.properties.changeType === 'Create' &&
                (!Number.isInteger(feature.properties.id) ||
                    feature.properties.id >= 0)
            ) {
                const nextId = this.nextFeatureId
                feature.properties.id = nextId
                feature.id = `${feature.properties.type}/${nextId}`
                console.info('Fixed legacy feature ID:', feature.id)

                this._geojsonChanged[this.requireFeatureId(feature)] = feature
                delete this._geojsonChanged[id]
            }
        }
        await this.setGeojsonChanged(this.getGeojsonChanged())
    }

    getCountGeojsonChanged(): number {
        if (this.getGeojsonChanged().features) {
            return this.getGeojsonChanged().features.length
        } else {
            return 0
        }
    }

    addFeatureToGeojsonChanged(feature: OsmGoFeature): Promise<unknown> {
        this._geojsonChanged[this.requireFeatureId(feature)] = feature
        this.notifyChangedData()
        return this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    updateFeatureToGeojsonChanged(feature: OsmGoFeature): Promise<unknown> {
        this._geojsonChanged[this.requireFeatureId(feature)] = feature
        this.notifyChangedData()
        return this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    deleteFeatureFromGeojsonChanged(feature: OsmGoFeature): Promise<unknown> {
        delete this._geojsonChanged[this.requireFeatureId(feature)]
        this.notifyChangedData()
        return this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    async applyUploadResults(
        results: Array<{ oldId: string; feature?: OsmGoFeature }>
    ): Promise<void> {
        const oldIds = results.map((result) => result.oldId)
        if (
            new Set(oldIds).size !== oldIds.length ||
            oldIds.some((id) => !this._geojsonChanged[id])
        ) {
            throw new Error('The OSM upload result does not match local data.')
        }

        const nextGeojson = { ...this._geojson }
        const nextGeojsonChanged = { ...this._geojsonChanged }

        for (const result of results) {
            delete nextGeojsonChanged[result.oldId]
            delete nextGeojson[result.oldId]
            if (result.feature) {
                nextGeojson[this.requireFeatureId(result.feature)] = cloneDeep(
                    result.feature
                )
            }
        }

        const geojson = featureCollection(
            Object.values(nextGeojson)
        ) as OsmGoFeatureCollection
        const geojsonChanged = featureCollection(
            Object.values(nextGeojsonChanged)
        ) as OsmGoFeatureCollection
        await Promise.all([
            this.localStorage.set('geojson', geojson),
            this.localStorage.set('geojsonChanged', geojsonChanged),
        ])
        this._geojson = nextGeojson
        this._geojsonChanged = nextGeojsonChanged
        this.notifyChangedData()
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

    cancelFeatureChange(feature: OsmGoFeature): void {
        const originalFeature = cloneDeep(feature.properties.originalData)
        if (feature.properties.changeType !== 'Create' && !originalFeature) {
            throw new Error('The original feature data is missing.')
        }
        this.deleteFeatureFromGeojsonChanged(feature)
        if (feature.properties.changeType !== 'Create' && originalFeature) {
            this.addFeatureToGeojson(originalFeature)
        }
    }

    async resetGeojsonChanged(): Promise<void> {
        this._geojsonChanged = {}
        this.notifyChangedData()
        await this.localStorage.set('geojsonChanged', this.geojsonChanged)
        this._nextFeatureId = 0
    }

    resetGeojsonData(): OsmGoFeatureCollection {
        this._geojson = {}
        const fc = featureCollection([]) as OsmGoFeatureCollection
        this.setGeojson(fc)
        return fc
    }

    private requireFeatureId(feature: OsmGoFeature): string {
        if (feature.id === undefined || feature.id === null) {
            throw new Error('A feature ID is required.')
        }
        return String(feature.id)
    }
}
