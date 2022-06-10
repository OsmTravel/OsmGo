import { Injectable, EventEmitter } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { cloneDeep } from 'lodash';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';


@Injectable({ providedIn: 'root' })
export class DataService {
    eventNewPage = new EventEmitter();
    geojson = { 'type': 'FeatureCollection', 'features': [] };
    geojsonChanged = { 'type': 'FeatureCollection', 'features': [] };
    geojsonWay = { 'type': 'FeatureCollection', 'features': [] };
    geojsonBbox = { 'type': 'FeatureCollection', 'features': [] };

     constructor(public localStorage: Storage) {
      }

    addIconCache(idIcon, uri){
        this.localStorage.set(idIcon, uri);
    }

    getIconCache(idIcon) {
        return this.localStorage.get(idIcon);
    }


    loadGeojson$(){
        return from(this.localStorage.get('geojson'))
            .pipe(
                map( geojson => {
                    geojson = geojson ? geojson : { 'type': 'FeatureCollection', 'features': [] }
                    this.geojson = geojson
                    return geojson
                } )
            )
    }

    loadGeojsonChanged$(){
        return from(this.localStorage.get('geojsonChanged'))
            .pipe(
                map( geojson => {
                    geojson = geojson ? geojson : { 'type': 'FeatureCollection', 'features': [] }
                    this.geojsonChanged = geojson
                    return geojson
                } )
            )
    }

    loadGeojsonBbox$(){
        return from(this.localStorage.get('geojsonBbox'))
            .pipe(
                map( geojson => {
                    geojson = geojson ? geojson : { 'type': 'FeatureCollection', 'features': [] }
                    this.geojsonBbox = geojson
                    return geojson
                } )
            )
    }
  

    async getKeysCacheIcon(){
        let allKeys = await this.localStorage.keys();
        return allKeys.filter( k => /^circle/.test(k) || /^square/.test(k) || /^penta/.test(k))
    }

    async clearIconCache(){
        let keys = await this.getKeysCacheIcon();
        let n = 0;
        for (let key of keys){
            console.log(key);
            await this.localStorage.remove(key);
            n++;
        }
        return n;
    }

    async clearCache(){
        try {
            await this.localStorage.clear();
        } catch (error) {}

        try{
            const dbs = await window.indexedDB.deleteDatabase('_ionickv')
        }
        catch (error) { console.log(error)}
        localStorage.clear();
       
    }


    setGeojsonBbox(geojsonBbox) {
        this.geojsonBbox = geojsonBbox;
        this.localStorage.set('geojsonBbox', this.geojsonBbox);
    }
    getGeojsonBbox() {
        return this.geojsonBbox;
    }

    resetGeojsonBbox() {
        this.setGeojsonBbox({ 'type': 'FeatureCollection', 'features': [] });
        return { 'type': 'FeatureCollection', 'features': [] };
    }


    setGeojsonWay(data) {
        this.geojsonWay = cloneDeep(data);
    }
    addFeatureToGeojsonWay(feature) {
        this.geojsonWay.features.push(feature);
    }

    getGeojson() {
        if (this.geojson){
            return this.geojson;
        } else {
            return { 'type': 'FeatureCollection', 'features': [] }
        }
       
    }

    setGeojson(data) {
        this.geojson = cloneDeep(data);
        this.localStorage.set('geojson', this.geojson);
    }
    addFeatureToGeojson(feature) {
        this.geojson.features.push(feature);
        this.setGeojson(this.geojson);
    }
    updateFeatureToGeojson(feature) {
        for (let i = 0; i < this.geojson.features.length; i++) {
            if (this.geojson.features[i].id === feature.id) {
                this.geojson.features[i] = feature;
                this.setGeojson(this.geojson);
                break;
            }
        }
    }

    deleteFeatureFromGeojson(feature) {
        for (let i = 0; i < this.geojson.features.length; i++) {
            if (this.geojson.features[i].id === feature.id) {
                this.geojson.features.splice(i, 1);
                this.setGeojson(this.geojson);
                break;
            }
        }
    }

    getFeatureById(id, origineData) {

          const features = (origineData === 'data_changed') ? this.getGeojsonChanged().features :   this.getGeojson().features;


        for (let i = 0; i < features.length; i++) {
            if (features[i].properties.id === id) {
                return cloneDeep(features[i]);
            }
        }
    }

    getGeojsonChanged() {
        return cloneDeep(this.geojsonChanged);
    }

    getNextNewId(){
        let minId = 0;
        for( const feature of this.geojsonChanged.features){
            if (feature.properties.id < minId ){
                minId = feature.properties.id
            }
        }
        return minId - 1
    }

    async setGeojsonChanged(geojson) { 
        this.geojsonChanged = geojson;
       await this.localStorage.set('geojsonChanged', this.geojsonChanged);
    }

    // replace id generate by version <= 1.5 (tmp_123) by -1, -2 etc...
    async replaceIdGenerateByOldVersion() {
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
    addFeatureToGeojsonChanged(feature):Promise<any> {
        this.geojsonChanged.features.push(feature);
        return this.localStorage.set('geojsonChanged', this.geojsonChanged);
  
    }

    updateFeatureToGeojsonChanged(feature):Promise<any> {
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            if (this.geojsonChanged.features[i].id === feature.id) {
                this.geojsonChanged.features[i] = feature;
            }
        }
        return this.localStorage.set('geojsonChanged', this.geojsonChanged);
    }
    deleteFeatureFromGeojsonChanged(feature):Promise<any> {
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            if (this.geojsonChanged.features[i].id === feature.id) {
                this.geojsonChanged.features.splice(i, 1);
                break;
            }
        }

       return this.localStorage.set('geojsonChanged', this.geojsonChanged);
        
    }

    getMergedGeojsonGeojsonChanged() {
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

    cancelFeatureChange(feature) {
        const originalFeature = cloneDeep(feature.properties.originalData);
        this.deleteFeatureFromGeojsonChanged(feature);
        // this.deleteFeatureFromGeojson(feature);
        if (feature.properties.changeType !== 'Create') {
            this.addFeatureToGeojson(originalFeature);
        }
    }

    // supprime l'intégralité des changements
    async resetGeojsonChanged(){
        this.geojsonChanged = { 'type': 'FeatureCollection', 'features': [] };
        await this.localStorage.set('geojsonChanged', this.geojsonChanged);
    }


    resetGeojsonData() {
        this.setGeojson({ 'type': 'FeatureCollection', 'features': [] });
        // this.getMergedGeojsonGeojsonChanged();
        // return this.getMergedGeojsonGeojsonChanged();
        return { 'type': 'FeatureCollection', 'features': [] };
    }

}
