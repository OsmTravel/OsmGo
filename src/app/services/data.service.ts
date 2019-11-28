import { Injectable, EventEmitter } from '@angular/core';
import { Storage } from '@ionic/storage';
import { cloneDeep } from 'lodash';


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
        return this.geojson;
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

    async setGeojsonChanged(geojson) { 
        this.geojsonChanged = geojson;
       await this.localStorage.set('geojsonChanged', this.geojsonChanged);
    }

    getCountGeojsonChanged(): number {
        if (this.getGeojsonChanged().features) {
            return this.getGeojsonChanged().features.length;
        } else {
            return 0;
        }
    }
    addFeatureToGeojsonChanged(feature) {
        this.geojsonChanged.features.push(feature);
        this.localStorage.set('geojsonChanged', this.geojsonChanged);
    }

    updateFeatureToGeojsonChanged(feature) {
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            if (this.geojsonChanged.features[i].id === feature.id) {
                this.geojsonChanged.features[i] = feature;
            }
        }
        this.localStorage.set('geojsonChanged', this.geojsonChanged);
    }
    deleteFeatureFromGeojsonChanged(feature) {

        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            if (this.geojsonChanged.features[i].id === feature.id) {
                this.geojsonChanged.features.splice(i, 1);
                break;
            }
        }

        this.localStorage.set('geojsonChanged', this.geojsonChanged);
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
