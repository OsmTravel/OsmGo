import { Injectable, EventEmitter } from '@angular/core'
import { Storage } from '@ionic/storage-angular'
import { cloneDeep } from 'lodash'
import { from, Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { OsmGoFeatureCollection, OsmGoFeature, FeatureIdSource } from 'src/type'

@Injectable({ providedIn: 'root' })
export class DataService {
    eventNewPage = new EventEmitter()
    geojson: OsmGoFeatureCollection = DataService.makeEmptyGeoJsonFC()
    geojsonChanged: OsmGoFeatureCollection = DataService.makeEmptyGeoJsonFC()
    geojsonWay: OsmGoFeatureCollection = DataService.makeEmptyGeoJsonFC()
    geojsonBbox: OsmGoFeatureCollection = DataService.makeEmptyGeoJsonFC()

    constructor(public localStorage: Storage) {}

    /** Creates a new GeoJSON feature collection that contains zero features. */
    static makeEmptyGeoJsonFC(): OsmGoFeatureCollection {
        return { type: 'FeatureCollection', features: [] }
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
                geojson = geojson ? geojson : DataService.makeEmptyGeoJsonFC()
                this.geojson = geojson
                return geojson
            })
        )
    }

    loadGeojsonChanged$(): Observable<OsmGoFeatureCollection> {
        return from(this.localStorage.get('geojsonChanged')).pipe(
            map((geojson: OsmGoFeatureCollection) => {
                geojson = geojson ? geojson : DataService.makeEmptyGeoJsonFC()
                this.geojsonChanged = geojson
                return geojson
            })
        )
    }

    loadGeojsonBbox$(): Observable<OsmGoFeatureCollection> {
        return from(this.localStorage.get('geojsonBbox')).pipe(
            map((geojson: OsmGoFeatureCollection) => {
                geojson = geojson ? geojson : DataService.makeEmptyGeoJsonFC()
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
        this.setGeojsonBbox(DataService.makeEmptyGeoJsonFC())
        return DataService.makeEmptyGeoJsonFC()
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
            return DataService.makeEmptyGeoJsonFC()
        }
    }

    setGeojson(data: OsmGoFeatureCollection): void {
        this.geojson = cloneDeep(data)
        this.localStorage.set('geojson', this.geojson)
    }

    addFeatureToGeojson(feature: OsmGoFeature): void {
        this.geojson.features.push(feature)
        this.setGeojson(this.geojson)
    }

    updateFeatureToGeojson(feature: OsmGoFeature): void {
        for (let i = 0; i < this.geojson.features.length; i++) {
            if (this.geojson.features[i].id === feature.id) {
                this.geojson.features[i] = feature
                this.setGeojson(this.geojson)
                break
            }
        }
    }

    deleteFeatureFromGeojson(feature: OsmGoFeature): void {
        for (let i = 0; i < this.geojson.features.length; i++) {
            if (this.geojson.features[i].id === feature.id) {
                this.geojson.features.splice(i, 1)
                this.setGeojson(this.geojson)
                break
            }
        }
    }

    /**
     * Looks up a feature with a given ID.
     *
     * If the source is `data`, the original OSM geojson features are searched
     * through, otherwise the local modified features are used for the lookup.
     *
     * @returns A deep copy of the feature if found, null otherwise.
     */
    getFeatureById(id: number, source: FeatureIdSource): OsmGoFeature | null {
        const features =
            source === 'data_changed'
                ? this.getGeojsonChanged().features
                : this.getGeojson().features

        for (let i = 0; i < features.length; i++) {
            if (features[i].properties.id === id) {
                return cloneDeep(features[i])
            }
        }

        return null
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

    getNextNewId(): number {
        let minId = 0
        for (const feature of this.geojsonChanged.features) {
            if (feature.properties.id < minId) {
                minId = feature.properties.id
            }
        }
        return minId - 1
    }

    async setGeojsonChanged(geojson: OsmGoFeatureCollection): Promise<void> {
        this.geojsonChanged = geojson
        await this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    // replace id generate by version <= 1.5 (tmp_123) by -1, -2 etc...
    async replaceIdGenerateByOldVersion(): Promise<void> {
        const geojsonChange = this.getGeojsonChanged()
        for (const feature of geojsonChange.features) {
            if (
                feature.properties.changeType == 'Create' &&
                (!Number.isInteger(feature.properties.id) ||
                    feature.properties.id >= 0)
            ) {
                const nextId = this.getNextNewId()
                feature.properties.id = nextId
                feature.id = `${feature.properties.type}/${nextId}`
                console.info('FIXE :', feature.id, feature.properties.id)
                await this.setGeojsonChanged(geojsonChange)
            }
        }
    }

    getCountGeojsonChanged(): number {
        if (this.getGeojsonChanged().features) {
            return this.getGeojsonChanged().features.length
        } else {
            return 0
        }
    }

    addFeatureToGeojsonChanged(feature: OsmGoFeature): Promise<any> {
        this.geojsonChanged.features.push(feature)
        return this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    updateFeatureToGeojsonChanged(feature: OsmGoFeature): Promise<any> {
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            if (this.geojsonChanged.features[i].id === feature.id) {
                this.geojsonChanged.features[i] = feature
            }
        }
        return this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    deleteFeatureFromGeojsonChanged(feature: OsmGoFeature): Promise<any> {
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            if (this.geojsonChanged.features[i].id === feature.id) {
                this.geojsonChanged.features.splice(i, 1)
                break
            }
        }

        return this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    getMergedGeojsonGeojsonChanged(): OsmGoFeatureCollection {
        // stock les id dans un array
        const changedIds = []
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            changedIds.push(this.geojsonChanged.features[i].id)
        }
        // DELETE from GEOJSON
        for (let i = this.geojson.features.length - 1; i >= 0; i--) {
            if (changedIds.indexOf(this.geojson.features[i].id) !== -1) {
                this.geojson.features.splice(i, 1)
            }
        }
        // ADD to geojson
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            this.geojson.features.push(this.geojsonChanged.features[i])
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
        this.geojsonChanged = DataService.makeEmptyGeoJsonFC()
        await this.localStorage.set('geojsonChanged', this.geojsonChanged)
    }

    resetGeojsonData(): OsmGoFeatureCollection {
        this.setGeojson(DataService.makeEmptyGeoJsonFC())
        // this.getMergedGeojsonGeojsonChanged();
        // return this.getMergedGeojsonGeojsonChanged();
        return DataService.makeEmptyGeoJsonFC()
    }
}
