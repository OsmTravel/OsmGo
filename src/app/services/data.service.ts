import { Injectable, EventEmitter } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Feature, FeatureCollection } from 'geojson';
import { cloneDeep } from 'lodash';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Creates a new GeoJSON feature collection that contains zero features. */
const makeEmptyGeoJsonFC = (): FeatureCollection => (
    { 'type': 'FeatureCollection', 'features': [] }
);

@Injectable({ providedIn: 'root' })
export class DataService {
    eventNewPage = new EventEmitter();
    geojson: FeatureCollection = makeEmptyGeoJsonFC();
    geojsonChanged: FeatureCollection = makeEmptyGeoJsonFC();
    geojsonWay: FeatureCollection = makeEmptyGeoJsonFC();
    geojsonBbox: FeatureCollection = makeEmptyGeoJsonFC();

    constructor(public localStorage: Storage) {}

    addIconCache(idIcon: string, uri): void {
        this.localStorage.set(idIcon, uri);
    }

    getIconCache(idIcon: string): Promise<any> {
        return this.localStorage.get(idIcon);
    }

    loadGeojson$(): Observable<FeatureCollection>{
        return from(this.localStorage.get('geojson'))
            .pipe(
                map((geojson: FeatureCollection) => {
                    geojson = geojson ? geojson : makeEmptyGeoJsonFC();
                    this.geojson = geojson
                    return geojson
                } )
            )
    }

    loadGeojsonChanged$(): Observable<FeatureCollection> {
        return from(this.localStorage.get('geojsonChanged'))
            .pipe(
                map((geojson: FeatureCollection) => {
                    geojson = geojson ? geojson : makeEmptyGeoJsonFC();
                    this.geojsonChanged = geojson
                    return geojson
                } )
            )
    }

    loadGeojsonBbox$(): Observable<FeatureCollection> {
        return from(this.localStorage.get('geojsonBbox'))
            .pipe(
                map((geojson: FeatureCollection) => {
                    geojson = geojson ? geojson : makeEmptyGeoJsonFC();
                    this.geojsonBbox = geojson
                    return geojson
                } )
            )
    }
  
    async getKeysCacheIcon(): Promise<string[]> {
        let allKeys: string[] = await this.localStorage.keys();
        return allKeys.filter( k => /^circle/.test(k) || /^square/.test(k) || /^penta/.test(k))
    }

    async clearIconCache(): Promise<number> {
        let keys: string[] = await this.getKeysCacheIcon();
        let n: number = 0;
        for (let key of keys){
            console.log(key);
            await this.localStorage.remove(key);
            n++;
        }
        return n;
    }

    async clearCache(): Promise<void> {
        try {
            await this.localStorage.clear();
        } catch (error) {
            console.log(error);
        }

        try{
            const dbDeleteReq = window.indexedDB.deleteDatabase('_ionickv')
        }
        catch (error) { console.log(error)}
        localStorage.clear();
    }

    setGeojsonBbox(geojsonBbox): void {
        this.geojsonBbox = geojsonBbox;
        this.localStorage.set('geojsonBbox', this.geojsonBbox);
    }
    getGeojsonBbox(): FeatureCollection {
        return this.geojsonBbox;
    }

    resetGeojsonBbox(): FeatureCollection {
        this.setGeojsonBbox(makeEmptyGeoJsonFC());
        return makeEmptyGeoJsonFC();
    }

    setGeojsonWay(data: FeatureCollection): void {
        this.geojsonWay = cloneDeep(data);
    }

    addFeatureToGeojsonWay(feature) {
        this.geojsonWay.features.push(feature);
    }

    getGeojson(): FeatureCollection {
        if (this.geojson){
            return this.geojson;
        } else {
            return makeEmptyGeoJsonFC();
        }
    }

    setGeojson(data: FeatureCollection): void {
        this.geojson = cloneDeep(data);
        this.localStorage.set('geojson', this.geojson);
    }

    addFeatureToGeojson(feature: Feature): void {
        this.geojson.features.push(feature);
        this.setGeojson(this.geojson);
    }

    updateFeatureToGeojson(feature: Feature) {
        for (let i = 0; i < this.geojson.features.length; i++) {
            if (this.geojson.features[i].id === feature.id) {
                this.geojson.features[i] = feature;
                this.setGeojson(this.geojson);
                break;
            }
        }
    }

    deleteFeatureFromGeojson(feature: Feature) {
        for (let i = 0; i < this.geojson.features.length; i++) {
            if (this.geojson.features[i].id === feature.id) {
                this.geojson.features.splice(i, 1);
                this.setGeojson(this.geojson);
                break;
            }
        }
    }

    getFeatureById(id: number, origineData: string): Feature {
        const features = (origineData === 'data_changed') ? this.getGeojsonChanged().features : this.getGeojson().features;

        for (let i = 0; i < features.length; i++) {
            if (features[i].properties.id === id) {
                return cloneDeep(features[i]);
            }
        }
    }

    getGeojsonChanged(): FeatureCollection {
        return cloneDeep(this.geojsonChanged);
    }

    getNextNewId(): number {
        let minId = 0;
        for( const feature of this.geojsonChanged.features){
            if (feature.properties.id < minId ){
                minId = feature.properties.id;
            }
        }
        return minId - 1;
    }

    async setGeojsonChanged(geojson: FeatureCollection): Promise<void> { 
        this.geojsonChanged = geojson;
        await this.localStorage.set('geojsonChanged', this.geojsonChanged);
    }

    // replace id generate by version <= 1.5 (tmp_123) by -1, -2 etc...
    async replaceIdGenerateByOldVersion(): Promise<void>{
        const geojsonChange = this.getGeojsonChanged()
        for(const feature of geojsonChange.features ){
            if (feature.properties.changeType == 'Create' && (!Number.isInteger(feature.properties.id) || feature.properties.id >= 0 )){
                const nextId = this.getNextNewId()
                feature.properties.id = nextId;
                feature.id = `${feature.properties.type}/${nextId}`
                console.info('FIXE :', feature.id, feature.properties.id);
                await this.setGeojsonChanged(geojsonChange)

            }
        }
    }

    getCountGeojsonChanged(): number {
        if (this.getGeojsonChanged().features) {
            return this.getGeojsonChanged().features.length;
        } else {
            return 0;
        }
    }

    addFeatureToGeojsonChanged(feature: Feature): Promise<any> {
        this.geojsonChanged.features.push(feature);
        return this.localStorage.set('geojsonChanged', this.geojsonChanged);
  
    }

    updateFeatureToGeojsonChanged(feature: Feature): Promise<any> {
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            if (this.geojsonChanged.features[i].id === feature.id) {
                this.geojsonChanged.features[i] = feature;
            }
        }
        return this.localStorage.set('geojsonChanged', this.geojsonChanged);
    }

    deleteFeatureFromGeojsonChanged(feature: Feature): Promise<any> {
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            if (this.geojsonChanged.features[i].id === feature.id) {
                this.geojsonChanged.features.splice(i, 1);
                break;
            }
        }

       return this.localStorage.set('geojsonChanged', this.geojsonChanged);
    }

    getMergedGeojsonGeojsonChanged(): FeatureCollection {
        // stock les id dans un array
        const changedIds = [];
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            changedIds.push(this.geojsonChanged.features[i].id);
        }
        // DELETE from GEOJSON
        for (let i = this.geojson.features.length - 1; i >= 0; i--) {
            if (changedIds.indexOf(this.geojson.features[i].id) !== -1) {
                this.geojson.features.splice(i, 1);
            }
        }
        // ADD to geojson
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            this.geojson.features.push(this.geojsonChanged.features[i]);
        }
        return cloneDeep(this.geojson);
    }

    cancelFeatureChange(feature: Feature): void {
        const originalFeature = cloneDeep(feature.properties.originalData);
        this.deleteFeatureFromGeojsonChanged(feature);
        // this.deleteFeatureFromGeojson(feature);
        if (feature.properties.changeType !== 'Create') {
            this.addFeatureToGeojson(originalFeature);
        }
    }

    // supprime l'intégralité des changements
    async resetGeojsonChanged(): Promise<void> {
        this.geojsonChanged = makeEmptyGeoJsonFC();
        await this.localStorage.set('geojsonChanged', this.geojsonChanged);
    }


    resetGeojsonData(): FeatureCollection {
        this.setGeojson(makeEmptyGeoJsonFC());
        // this.getMergedGeojsonGeojsonChanged();
        // return this.getMergedGeojsonGeojsonChanged();
        return makeEmptyGeoJsonFC();
    }

}
