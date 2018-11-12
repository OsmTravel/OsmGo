import { Component } from '@angular/core';

import { NavController, AlertController, Platform,ViewController } from 'ionic-angular';
import { OsmApiService } from '../../services/osmApi.service';
import { TagsService } from '../../services/tags.service';
import { MapService } from '../../services/map.service';
import { DataService } from '../../services/data.service';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/timer';


@Component({
    selector: 'page-push-data-to-osm',
    templateUrl: 'pushDataToOsm.html'
})

export class PushDataToOsmPage {

    summary = { "Total": 0, "Create": 0, "Update": 0, "Delete": 0 }
    index = 0;
    changesetId = '';
    commentChangeset = '';
    isPushing: boolean = false;
    featuresChanges = {};

    constructor(
        public dataService: DataService,
        public osmApi: OsmApiService,
        public tagsService: TagsService,
        public mapService: MapService,
        public navCtrl: NavController,
        private alertCtrl: AlertController,
           public platform: Platform,
            public viewCtrl: ViewController
    ) {
        this.platform.registerBackButtonAction(e => {
            this.dismiss();
        });
        this.commentChangeset = this.osmApi.getChangesetComment();
        this.featuresChanges = this.dataService.getGeojsonChanged().features;
    }

    dismiss(data = null) {
        this.viewCtrl.dismiss(data);
    }

    presentConfirm() {
        let alert = this.alertCtrl.create({
            title: 'Vraiment?',
            message: 'Supprimer toutes les modifications?',
            buttons: [
                {
                    text: 'Annuler',
                    role: 'cancel',
                    handler: () => {

                    }
                },
                {
                    text: 'Confirmer',
                    handler: () => {
                        this.cancelAllFeatures()
                    }
                }
            ]
        });
        alert.present();
    }

    displayError(error) {
        let alert = this.alertCtrl.create({
            title: error.statusText + ' : ' + error.status,
            message: error._body,
            buttons: [
                {
                    text: 'Fermer',
                    role: 'cancel',
                    handler: () => {

                    }
                }
            ]
        });
        alert.present();
    }
    getSummary() {
        let summary = { "Total": 0, "Create": 0, "Update": 0, "Delete": 0 }
        this.featuresChanges = this.dataService.getGeojsonChanged().features;
        let featuresChanged = this.dataService.getGeojsonChanged().features;

        for (let i = 0; i < featuresChanged.length; i++) {
            let featureChanged = featuresChanged[i];
            summary[featureChanged.properties.changeType]++;
            summary['Total']++
        }
        return summary;
    }

    private pushFeatureToOsm(featureChanged, CS, index) {
        if (featureChanged) {
            if (featureChanged.properties.changeType === 'Create') {
                this.osmApi.apiOsmCreateNode(featureChanged, CS)
                    .subscribe(id => {

                        let newFeature = {};
                        newFeature['type'] = 'Feature';
                        newFeature['id'] = 'node/' + id;
                        newFeature['properties'] = {};
                        newFeature['geometry'] = JSON.parse(JSON.stringify(featureChanged.geometry));
                        newFeature['properties']['type'] = 'node';
                        newFeature['properties']['id'] = id;
                        newFeature['properties']['tags'] = JSON.parse(JSON.stringify(featureChanged.properties.tags));
                        newFeature['properties']['meta'] = {};
                        newFeature['properties']['meta']['version'] = 1;
                        newFeature['properties']['meta']['user'] = this.osmApi.getUserInfo().display_name;
                        newFeature['properties']['meta']['uid'] = this.osmApi.getUserInfo().uid;
                        newFeature['properties']['meta']['timestamp'] = new Date().toISOString();

                        newFeature = this.mapService.getIconStyle(newFeature); // style
                        this.summary.Total--;
                        this.summary.Create--;
                        // this.dataService.deleteFeatureFromGeojson(featureChanged); //suppression des data
                        this.dataService.deleteFeatureFromGeojsonChanged(featureChanged)

                        this.dataService.addFeatureToGeojson(newFeature); //creation du nouveau 
                        this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index)
                        this.featuresChanges = this.dataService.getGeojsonChanged().features;
                    },
                    error => {
                        let featuresWithError = this.dataService.getGeojsonChanged().features[this.index];
                        featuresWithError['error'] = error
                        this.dataService.updateFeatureToGeojsonChanged(featuresWithError)

                        this.featuresChanges = this.dataService.getGeojsonChanged().features;
                        this.index++;
                        this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index)

                    });
            }

            else if (featureChanged.properties.changeType === 'Update') {
                this.osmApi.apiOsmUpdateOsmElement(featureChanged, CS)
                    .subscribe(id => {
                        let newFeature = {};
                        newFeature = featureChanged;
                        newFeature['properties']['meta']['version']++;
                        newFeature['properties']['meta']['user'] = this.osmApi.getUserInfo().display_name;
                        newFeature['properties']['meta']['uid'] = this.osmApi.getUserInfo().uid;
                        newFeature['properties']['meta']['timestamp'] = new Date().toISOString();
                        delete newFeature['properties']['changeType'];
                        delete newFeature['properties']['originalData'];


                        newFeature = this.mapService.getIconStyle(newFeature); // style
                        this.summary.Total--;
                        this.summary.Update--;

                        //this.dataService.deleteFeatureFromGeojson(featureChanged);
                        this.dataService.deleteFeatureFromGeojsonChanged(featureChanged)
                        this.dataService.addFeatureToGeojson(newFeature);

                        this.featuresChanges = this.dataService.getGeojsonChanged().features;
                        this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index)


                    },
                    error => {
                        let featuresWithError = this.dataService.getGeojsonChanged().features[this.index];
                        featuresWithError['error'] = error
                        this.dataService.updateFeatureToGeojsonChanged(featuresWithError)

                        this.index++;
                        this.featuresChanges = this.dataService.getGeojsonChanged().features;
                        this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index)

                    });
            }

            else if (featureChanged.properties.changeType === 'Delete') {
                this.osmApi.apiOsmDeleteOsmElement(featureChanged, CS)
                    .subscribe(id => {
                        this.summary.Total--;
                        this.summary.Delete--;

                        //this.dataService.deleteFeatureFromGeojson(featureChanged);
                        this.dataService.deleteFeatureFromGeojsonChanged(featureChanged)
                        this.featuresChanges = this.dataService.getGeojsonChanged().features;
                        this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index)

                    },
                    error => {

                        let featuresWithError = this.dataService.getGeojsonChanged().features[this.index];
                        featuresWithError['error'] = error
                        this.dataService.updateFeatureToGeojsonChanged(featuresWithError)

                        this.index++;
                        this.featuresChanges = this.dataService.getGeojsonChanged().features;
                        this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index)

                    });
            }

        }
        else {
            this.isPushing = false;
            this.summary = this.getSummary();
            this.mapService.eventMarkerReDraw.emit(this.dataService.getGeojson());
            this.mapService.eventMarkerChangedReDraw.emit(this.dataService.getGeojsonChanged());
            // this.mapService.eventMarkerChangedReDraw.emit(this.dataService.getMergedGeojsonGeojsonChanged());
            this.featuresChanges = this.dataService.getGeojsonChanged().features;
            if (this.dataService.getGeojsonChanged().features.length === 0) { // Y'a plus d'éléments à pusher
                this.navCtrl.popToRoot();
            }
        }
    }

    pushDataToOsm(commentChangeset) {
        this.isPushing = true;
        //let featuresChanged = this.dataService.getGeojsonChanged().features;
        this.osmApi.getValidChangset(commentChangeset).subscribe(CS => {
            this.index = 0
            this.changesetId = CS;
            this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index)
        });
    }

    cancelAllFeatures() { // roolBack
        let featuresChanged = this.dataService.getGeojsonChanged().features;
        for (let i = 0; i < featuresChanged.length; i++) {
            this.dataService.cancelFeatureChange(featuresChanged[i])
        }
        this.summary = this.getSummary();
        this.featuresChanges = this.dataService.getGeojsonChanged().features;
        Observable.timer(100).subscribe(t => {
            this.mapService.eventMarkerReDraw.emit(this.dataService.getGeojson());
            this.mapService.eventMarkerChangedReDraw.emit(this.dataService.getGeojsonChanged());
            this.navCtrl.popToRoot();
          })
    }

    centerToElement(pointCoordinates){
        if (this.mapService.map.getZoom() < 18.5)
            this.mapService.map.setZoom(18.5);
        this.mapService.map.setCenter(pointCoordinates);
        this.dismiss();
    }

    ngAfterViewInit() {
        this.summary = this.getSummary();
        this.index = 0
    }

}


