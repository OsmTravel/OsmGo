import { Injectable, EventEmitter } from '@angular/core'
import { Storage } from '@ionic/storage-angular'
import { cloneDeep } from 'lodash'
import { from, Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import {
    OsmGoFeatureCollection,
    OsmGoFeature,
    FeatureIdSource,
} from '@osmgo/type'
import { feature, featureCollection } from '@turf/turf'

@Injectable({ providedIn: 'root' })
export class DataService {
    eventNewPage = new EventEmitter()

    /**
     * Primary data storage for official OSM POIs.
     * Don't read from this value directly. Instead use the `geojson` member
     * variable.
     *
     * A hashmap is used to have a constant time complexity when looking up
     * entries with a known ID.
     */
    _geojson: Record<string, OsmGoFeature> = {}

    /**
     * Primary data storage for self-created or modified POIs.
     * Don't read from this value directly. Instead use the `geojsonChanged`
     * member variable.
     *
     * A hashmap is used to have a constant time complexity when looking up
     * entries with a known ID.
     */
    _geojsonChanged: Record<string, OsmGoFeature> = {}

    geojsonWay: OsmGoFeatureCollection = featureCollection(
        []
    ) as OsmGoFeatureCollection
    geojsonBbox: OsmGoFeatureCollection = featureCollection(
        []
    ) as OsmGoFeatureCollection

    /** Next unused ID that can be used for a new feature. */
    private _nextFeatureId = 0

    constructor(public localStorage: Storage) {}

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

    // TODO: Is this method still needed? It is not used anywhere.
    addIconCache(idIcon: string, uri): void {
        this.localStorage.set(idIcon, uri)
    }

    // TODO: Is this method still needed? It is not used anywhere.
    getIconCache(idIcon: string): Promise<any> {
        return this.localStorage.get(idIcon)
    }

    loadGeojson$(): Observable<OsmGoFeatureCollection> {
        return from(this.localStorage.get('geojson')).pipe(
            map((geojson: OsmGoFeatureCollection) => {
                geojson = geojson
                    ? geojson
                    : (featureCollection([]) as OsmGoFeatureCollection)
                for (const feature of geojson.features) {
                    this._geojson[feature.id] = feature
                }
                return geojson
            })
        )
    }

    loadGeojsonChanged$(): Observable<OsmGoFeatureCollection> {
        return from(this.localStorage.get('geojsonChanged')).pipe(
            map((geojson: OsmGoFeatureCollection) => {
                geojson = geojson
                    ? geojson
                    : (featureCollection([]) as OsmGoFeatureCollection)
                for (const feature of geojson.features) {
                    this._geojsonChanged[feature.id] = feature
                }

                // At this point we know previously created elements from which we can determine the min ID.
                this.forceNextFeatureIdSync()

                return geojson
            })
        )
    }

    loadGeojsonBbox$(): Observable<OsmGoFeatureCollection> {
        return from(this.localStorage.get('geojsonBbox')).pipe(
            map((geojson: OsmGoFeatureCollection) => {
                geojson = geojson
                    ? geojson
                    : (featureCollection([]) as OsmGoFeatureCollection)
                this.geojsonBbox = geojson
                return geojson
            })
        )
    }

    async getKeysCacheIcon(): Promise<string[]> {
        let allKeys: string[] = await this.localStorage.keys()
        return allKeys.filter(
            (k) => /^circle/.test(k) || /^square/.test(k) || /^penta/.test(k)
        )
    }

    async clearIconCache(): Promise<number> {
        let keys: string[] = await this.getKeysCacheIcon()
        let n: number = 0
        for (let key of keys) {
            console.log(key)
            await this.localStorage.remove(key)
            n++
        }
        return n
    }

    async clearCache(): Promise<void> {
        try {
            await this.localStorage.clear()
        } catch (error) {
            console.log(error)
        }

        try {
            const dbDeleteReq = window.indexedDB.deleteDatabase('_ionickv')
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

    addFeatureToGeojsonWay(feature: OsmGoFeature) {
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
        this._geojson = {}
        for (const feature of data.features) {
            this._geojson[feature.id] = cloneDeep(feature)
        }
        this.localStorage.set('geojson', this.geojson)
    }

    addFeatureToGeojson(feature: OsmGoFeature): void {
        this._geojson[feature.id] = feature
        this.setGeojson(this.geojson)
    }

    updateFeatureToGeojson(feature: OsmGoFeature): void {
        this._geojson[feature.id] = feature
        this.setGeojson(this.geojson)
    }

    deleteFeatureFromGeojson(feature: OsmGoFeature): void {
        delete this._geojson[feature.id]
        this.setGeojson(this.geojson)
    }

    /**
     * Looks up a feature with a given ID.
     *
     * If the source is `data`, the original OSM geojson features are searched
     * through, otherwise the local modified features are used for the lookup.
     *
     * @returns A deep copy of the feature if found, null otherwise.
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
    get nextFeatureId() {
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

    async setGeojsonChanged(data: OsmGoFeatureCollection): Promise<void> {
        this._geojsonChanged = {}
        for (const feature of data.features) {
            this._geojsonChanged[feature.id] = cloneDeep(feature)
        }
        await this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    // replace id generate by version <= 1.5 (tmp_123) by -1, -2 etc...
    async replaceIdGenerateByOldVersion(): Promise<void> {
        for (const [id, feature] of Object.entries(this._geojsonChanged)) {
            if (
                feature.properties.changeType == 'Create' &&
                (!Number.isInteger(feature.properties.id) ||
                    feature.properties.id >= 0)
            ) {
                const nextId = this.nextFeatureId
                feature.properties.id = nextId
                feature.id = `${feature.properties.type}/${nextId}`
                console.info('FIXE :', feature.id, feature.properties.id)

                this._geojsonChanged[feature.id] = feature
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

    addFeatureToGeojsonChanged(feature: OsmGoFeature): Promise<any> {
        this._geojsonChanged[feature.id] = feature
        return this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    updateFeatureToGeojsonChanged(feature: OsmGoFeature): Promise<any> {
        this._geojsonChanged[feature.id] = feature
        return this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    deleteFeatureFromGeojsonChanged(feature: OsmGoFeature): Promise<any> {
        delete this._geojsonChanged[feature.id]
        return this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    getMergedGeojsonGeojsonChanged(): OsmGoFeatureCollection {
        // stock les id dans un array
        const changedIds = Object.keys(this._geojsonChanged)
        // DELETE from GEOJSON
        for (const id of changedIds) {
            delete this._geojson[id]
        }
        // ADD to geojson
        for (const feature of Object.values(this._geojsonChanged)) {
            this._geojson[feature.id] = feature
        }
        return cloneDeep(this.geojson)
    }

    cancelFeatureChange(feature: OsmGoFeature): void {
        const originalFeature = cloneDeep(feature.properties.originalData)
        this.deleteFeatureFromGeojsonChanged(feature)
        // this.deleteFeatureFromGeojson(feature);
        if (feature.properties.changeType !== 'Create') {
            this.addFeatureToGeojson(originalFeature)
        }
    }

    // supprime l'intégralité des changements
    async resetGeojsonChanged(): Promise<void> {
        this._geojsonChanged = {}
        await this.localStorage.set('geojsonChanged', this.geojsonChanged)
        this._nextFeatureId = 0
    }

    resetGeojsonData(): OsmGoFeatureCollection {
        this._geojson = {}
        const fc = featureCollection([]) as OsmGoFeatureCollection
        this.setGeojson(fc)
        // this.getMergedGeojsonGeojsonChanged();
        // return this.getMergedGeojsonGeojsonChanged();
        return fc
    }
}
