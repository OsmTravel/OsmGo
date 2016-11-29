import { Injectable, EventEmitter } from '@angular/core';
import { Storage } from '@ionic/storage';


@Injectable()
export class DataService {
    eventNewPage = new EventEmitter();
    geojson = { "type": "FeatureCollection", "features": [] };
    geojsonChanged = { "type": "FeatureCollection", "features": [] }
    geojsonWay = { "type": "FeatureCollection", "features": [] };
    geojsonBbox = { "type": "FeatureCollection", "features": [] };
    localStorage = new Storage();
    constructor() {

    }



    setGeojsonBbox(geojsonBbox) {
        this.geojsonBbox = geojsonBbox;
        this.localStorage.set('geojsonBbox', this.geojsonBbox);
    }
    getGeojsonBbox() {
        return this.geojsonBbox
    }

    resetGeojsonBbox() {
        this.setGeojsonBbox({ "type": "FeatureCollection", "features": [] });
    }


    setGeojsonWay(data) {
        this.geojsonWay = JSON.parse(JSON.stringify(data));
    }
    addFeatureToGeojsonWay(feature) {
        this.geojsonWay.features.push(feature);
    }

    getGeojson() {
        return this.geojson;
    }

    setGeojson(data) {
        this.geojson = JSON.parse(JSON.stringify(data));
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

    getFeatureById(id) {
        let features = this.getGeojson().features;
        for (let i = 0; i < features.length; i++) {
            if (features[i].properties.id === id) {
                return JSON.parse(JSON.stringify(features[i]));
            }
        }
    }


    /* Delayedd */

    getGeojsonChanged() {
        return JSON.parse(JSON.stringify(this.geojsonChanged));
    }

    setGeojsonChanged(geojson) {
        this.geojsonChanged = geojson;
        this.localStorage.set('geojsonChanged', this.geojsonChanged);
    }

    getCountGeojsonChanged(): number {
        if (this.getGeojsonChanged().features) {
            return this.getGeojsonChanged().features.length
        }
        else {
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
        let changedIds = [];
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            changedIds.push(this.geojsonChanged.features[i].id);
        }
        //DELETE from GEOJSON
        for (let i = this.geojson.features.length - 1; i >= 0; i--) {
            if (changedIds.indexOf(this.geojson.features[i].id) != -1) {
                this.geojson.features.splice(i, 1);
            }
        }
        // ADD to geojson
        for (let i = 0; i < this.geojsonChanged.features.length; i++) {
            this.geojson.features.push(this.geojsonChanged.features[i]);
        }
        return JSON.parse(JSON.stringify(this.geojson))
    }

    cancelFeatureChange(feature) {

        let originalFeature = JSON.parse(JSON.stringify(feature.properties.originalData));
        this.deleteFeatureFromGeojsonChanged(feature);
        this.deleteFeatureFromGeojson(feature);
        if (feature.properties.changeType !== 'Create') {
            this.addFeatureToGeojson(originalFeature);
        }
    }

    resetGeojsonData() {
        this.setGeojson({ "type": "FeatureCollection", "features": [] });
        return { "type": "FeatureCollection", "features": [] };
    }

}