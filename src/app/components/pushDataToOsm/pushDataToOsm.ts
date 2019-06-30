
import { Component, AfterViewInit } from '@angular/core';

import { NavController, AlertController, Platform } from '@ionic/angular';
import { OsmApiService } from '../../services/osmApi.service';
import { TagsService } from '../../services/tags.service';
import { MapService } from '../../services/map.service';
import { DataService } from '../../services/data.service';
import { ConfigService } from '../../services/config.service';
import { timer } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'page-push-data-to-osm',
    templateUrl: './pushDataToOsm.html',
    styleUrls: ['./pushDataToOsm.scss']
})

export class PushDataToOsmPage implements AfterViewInit {

    summary = { 'Total': 0, 'Create': 0, 'Update': 0, 'Delete': 0 };
    index = 0;
    changesetId = '';
    commentChangeset = '';
    isPushing = false;
    featuresChanges = {};

    constructor(
        public dataService: DataService,
        public osmApi: OsmApiService,
        public tagsService: TagsService,
        public mapService: MapService,
        public navCtrl: NavController,
        private alertCtrl: AlertController,
        private configService: ConfigService,
        public platform: Platform,
        private translate : TranslateService
    ) {

        this.commentChangeset = this.configService.getChangeSetComment();
        this.featuresChanges = this.dataService.getGeojsonChanged().features;
    }


    presentConfirm() {
        this.alertCtrl.create({
            header: this.translate.instant('SEND_DATA.DELETE_CONFIRM_HEADER'),
            message: this.translate.instant('SEND_DATA.DELETE_CONFIRM_MESSAGE'),
            buttons: [
                {
                    text: this.translate.instant('SHARED.CANCEL'),
                    role: 'cancel',
                    handler: () => {

                    }
                },
                {
                    text: this.translate.instant('SHARED.CONFIRM'),
                    handler: () => {
                        this.cancelAllFeatures();
                    }
                }
            ]
        }).then(alert => {
            alert.present();
        });

    }

    displayError(error) {
        this.alertCtrl.create({
            // title: error.statusText + ' : ' + error.status,
            message: error.error,
            buttons: [
                {
                    text: this.translate.instant('SEND_DATA.CLOSE'),
                    role: 'cancel',
                    handler: () => {

                    }
                }
            ]
        })
            .then(alert => {
                alert.present();
            });
    }

    getSummary() {
        const summary = { 'Total': 0, 'Create': 0, 'Update': 0, 'Delete': 0 };
        this.featuresChanges = this.dataService.getGeojsonChanged().features;
        const featuresChanged = this.dataService.getGeojsonChanged().features;

        for (let i = 0; i < featuresChanged.length; i++) {
            const featureChanged = featuresChanged[i];
            summary[featureChanged.properties.changeType]++;
            summary['Total']++;
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
                        this.dataService.deleteFeatureFromGeojsonChanged(featureChanged);

                        this.dataService.addFeatureToGeojson(newFeature); // creation du nouveau
                        this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index);
                        this.featuresChanges = this.dataService.getGeojsonChanged().features;
                    },
                        error => {
                            const featuresWithError = this.dataService.getGeojsonChanged().features[this.index];
                            featuresWithError['error'] = error;
                            this.dataService.updateFeatureToGeojsonChanged(featuresWithError);

                            this.featuresChanges = this.dataService.getGeojsonChanged().features;
                            this.index++;
                            this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index);

                        });
            } else if
                (featureChanged.properties.changeType === 'Update') {
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

                        // this.dataService.deleteFeatureFromGeojson(featureChanged);
                        this.dataService.deleteFeatureFromGeojsonChanged(featureChanged);
                        this.dataService.addFeatureToGeojson(newFeature);

                        this.featuresChanges = this.dataService.getGeojsonChanged().features;
                        this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index);


                    },
                        error => {
                            const featuresWithError = this.dataService.getGeojsonChanged().features[this.index];
                            featuresWithError['error'] = error;
                            this.dataService.updateFeatureToGeojsonChanged(featuresWithError);

                            this.index++;
                            this.featuresChanges = this.dataService.getGeojsonChanged().features;
                            this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index);

                        });
            } else if
                (featureChanged.properties.changeType === 'Delete') {
                this.osmApi.apiOsmDeleteOsmElement(featureChanged, CS)
                    .subscribe(id => {
                        this.summary.Total--;
                        this.summary.Delete--;

                        // this.dataService.deleteFeatureFromGeojson(featureChanged);
                        this.dataService.deleteFeatureFromGeojsonChanged(featureChanged);
                        this.featuresChanges = this.dataService.getGeojsonChanged().features;
                        this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index);

                    },
                        error => {

                            const featuresWithError = this.dataService.getGeojsonChanged().features[this.index];
                            featuresWithError['error'] = error;
                            this.dataService.updateFeatureToGeojsonChanged(featuresWithError);

                            this.index++;
                            this.featuresChanges = this.dataService.getGeojsonChanged().features;
                            this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index);

                        });
            }

        } else {
            this.isPushing = false;
            this.summary = this.getSummary();
            this.mapService.eventMarkerReDraw.emit(this.dataService.getGeojson());
            this.mapService.eventMarkerChangedReDraw.emit(this.dataService.getGeojsonChanged());
            // this.mapService.eventMarkerChangedReDraw.emit(this.dataService.getMergedGeojsonGeojsonChanged());
            this.featuresChanges = this.dataService.getGeojsonChanged().features;
            if (this.dataService.getGeojsonChanged().features.length === 0) { // Y'a plus d'éléments à pusher
                this.navCtrl.pop();
            }
        }
    }

    pushDataToOsm(commentChangeset) {
        this.isPushing = true;
        this.configService.setChangeSetComment(commentChangeset);
        // let featuresChanged = this.dataService.getGeojsonChanged().features;
        this.osmApi.getValidChangset(commentChangeset).subscribe(CS => {
            this.index = 0;
            this.changesetId = CS;
            this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index);
        });
    }

    cancelAllFeatures() { // roolBack
        const featuresChanged = this.dataService.getGeojsonChanged().features;
        for (let i = 0; i < featuresChanged.length; i++) {
            this.dataService.cancelFeatureChange(featuresChanged[i]);
        }
        this.dataService.resetGeojsonChanged();
        this.summary = this.getSummary();
        this.featuresChanges = this.dataService.getGeojsonChanged().features;
        timer(100).subscribe(t => {
            this.mapService.eventMarkerReDraw.emit(this.dataService.getGeojson());
            this.mapService.eventMarkerChangedReDraw.emit(this.dataService.getGeojsonChanged());
            this.navCtrl.pop();
        });
    }

    centerToElement(pointCoordinates) {
        if (this.mapService.map.getZoom() < 18.5) {
            this.mapService.map.setZoom(18.5);
        }
        this.mapService.map.setCenter(pointCoordinates);
        this.navCtrl.pop();
    }

    ngAfterViewInit() {
        this.summary = this.getSummary();
        this.index = 0;
    }

}


