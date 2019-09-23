
import { Component, AfterViewInit } from '@angular/core';

import { NavController, AlertController, Platform } from '@ionic/angular';
import { OsmApiService } from '../../services/osmApi.service';
import { TagsService } from '../../services/tags.service';
import { MapService } from '../../services/map.service';
import { DataService } from '../../services/data.service';
import { ConfigService } from '../../services/config.service';
import { timer } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';

@Component({
    selector: 'page-push-data-to-osm',
    templateUrl: './pushDataToOsm.html',
    styleUrls: ['./pushDataToOsm.scss']
})

export class PushDataToOsmPage implements AfterViewInit {

    summary = { 'Total': 0, 'Create': 0, 'Update': 0, 'Delete': 0 };
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
        private translate: TranslateService
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
            message: error,
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

    /**
     * Send this feature to OSM
     */
    private pushFeatureToOsm(featureChanged, CS) {
        return new Promise((resolve, reject) => {
            if (featureChanged.properties.changeType === 'Create') {
                this.osmApi.apiOsmCreateNode(featureChanged, CS)
                    .subscribe(id => {
                        let newFeature = {};
                        newFeature['type'] = 'Feature';
                        newFeature['id'] = 'node/' + id;
                        newFeature['properties'] = {};
                        newFeature['geometry'] = _.cloneDeep(featureChanged.geometry);
                        newFeature['properties']['type'] = 'node';
                        newFeature['properties']['id'] = id;
                        newFeature['properties']['tags'] = _.cloneDeep(featureChanged.properties.tags);
                        newFeature['properties']['meta'] = {};
                        newFeature['properties']['meta']['version'] = 1;
                        newFeature['properties']['meta']['user'] = this.osmApi.getUserInfo().display_name;
                        newFeature['properties']['meta']['uid'] = this.osmApi.getUserInfo().uid;
                        newFeature['properties']['meta']['timestamp'] = new Date().toISOString();
                        newFeature['properties']['time'] = new Date().getTime();

                        newFeature = this.mapService.getIconStyle(newFeature); // style
                        this.summary.Total--;
                        this.summary.Create--;
                        
                        this.dataService.deleteFeatureFromGeojsonChanged(featureChanged);

                        this.dataService.addFeatureToGeojson(newFeature); // creation du nouveau TODO
                        this.featuresChanges = this.dataService.getGeojsonChanged().features;
                        resolve(newFeature)
                    },
                        async error => {
                            featureChanged['error'] = error.error || error.error.message || 'oups';
                            this.dataService.updateFeatureToGeojsonChanged(featureChanged);
                            this.featuresChanges = this.dataService.getGeojsonChanged().features;
                            reject(error);

                        });
            } else if
                (featureChanged.properties.changeType === 'Update') {

                this.osmApi.apiOsmUpdateOsmElement(featureChanged, CS)
                    .subscribe(newVersion => {
                        let newFeature = {};
                        newFeature = featureChanged;
                        newFeature['properties']['meta']['version'] = newVersion;
                        newFeature['properties']['meta']['user'] = this.osmApi.getUserInfo().display_name;
                        newFeature['properties']['meta']['uid'] = this.osmApi.getUserInfo().uid;
                        newFeature['properties']['meta']['timestamp'] = new Date().toISOString();
                        newFeature['properties']['time'] = new Date().getTime();
                        if (newFeature['properties']['tags']['fixme']) {
                            newFeature['properties']['fixme'] = true;
                        } else {
                            newFeature['properties']['fixme'] = false;
                        }

                        delete newFeature['properties']['changeType'];
                        delete newFeature['properties']['originalData'];


                        newFeature = this.mapService.getIconStyle(newFeature); // style
                        this.summary.Total--;
                        this.summary.Update--;

                        this.dataService.deleteFeatureFromGeojsonChanged(featureChanged);
                        this.dataService.addFeatureToGeojson(newFeature);

                        this.featuresChanges = this.dataService.getGeojsonChanged().features;
                        resolve(newFeature)

                    },
                        error => {
                            featureChanged['error'] = error.error || error.error.message || 'oups';
                            this.dataService.updateFeatureToGeojsonChanged(featureChanged);
                      
                            this.featuresChanges = this.dataService.getGeojsonChanged().features;
                            
                            reject(error)
                            // this.pushFeatureToOsm(this.dataService.getGeojsonChanged().features[this.index], this.changesetId, this.index);

                        });
            } else if
                (featureChanged.properties.changeType === 'Delete') {
                this.osmApi.apiOsmDeleteOsmElement(featureChanged, CS)
                    .subscribe(id => {
                        this.summary.Total--;
                        this.summary.Delete--;
                        this.dataService.deleteFeatureFromGeojsonChanged(featureChanged);
                        this.featuresChanges = this.dataService.getGeojsonChanged().features;
                        resolve(id);
                    },
                        async error => {
                            featureChanged['error'] = error.error || error.error.message || 'oups';
                            this.dataService.updateFeatureToGeojsonChanged(featureChanged);
                            this.featuresChanges = this.dataService.getGeojsonChanged().features;
                            reject(error)
                        });
            }
        })
    }

    pushDataToOsm(commentChangeset) {
        if (this.isPushing) {
            console.log('Already being sent')
            return;
        }

        this.isPushing = true;
        this.configService.setChangeSetComment(commentChangeset);
        // let featuresChanged = this.dataService.getGeojsonChanged().features;
        this.osmApi.getValidChangset(commentChangeset)
            .subscribe(async CS => {
                const cloneGeojsonChanged = this.dataService.getGeojsonChanged()
                this.changesetId = CS;
                for (let feature of cloneGeojsonChanged.features) {
                    // TODO => observable, switchmap...
                    try {
                        await this.pushFeatureToOsm(feature, this.changesetId)
                    } catch (error) {

                    }
                };
                this.isPushing = false;
                this.summary = this.getSummary();
                this.mapService.eventMarkerReDraw.emit(this.dataService.getGeojson());
                this.mapService.eventMarkerChangedReDraw.emit(this.dataService.getGeojsonChanged());
                this.featuresChanges = this.dataService.getGeojsonChanged().features;
                if (this.dataService.getGeojsonChanged().features.length === 0) { // Y'a plus d'éléments à pusher
                    this.navCtrl.pop();
                }
            });
    }

    async cancelAllFeatures() { // rollBack
        const featuresChanged = this.dataService.getGeojsonChanged().features;
        for (let feature of featuresChanged) {
            this.dataService.cancelFeatureChange(feature);
        }
        await this.dataService.resetGeojsonChanged();
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
    }

}


