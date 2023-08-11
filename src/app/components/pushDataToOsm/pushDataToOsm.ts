import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core'

import { NavController, AlertController, Platform } from '@ionic/angular'
import { OsmApiService } from '@services/osmApi.service'
import { TagsService } from '@services/tags.service'
import { MapService } from '@services/map.service'
import { DataService } from '@services/data.service'
import { ConfigService } from '@services/config.service'
import { timer } from 'rxjs'
import { TranslateService } from '@ngx-translate/core'
import { cloneDeep, clone } from 'lodash'
import { addAttributesToFeature } from '@scripts/osmToOsmgo/index.js'
import { InitService } from '@services/init.service'
import { take } from 'rxjs/operators'

@Component({
    selector: 'page-push-data-to-osm',
    templateUrl: './pushDataToOsm.html',
    styleUrls: ['./pushDataToOsm.scss'],
})
export class PushDataToOsmPage implements AfterViewInit, OnInit, OnDestroy {
    summary = { Total: 0, Create: 0, Update: 0, Delete: 0 }
    changesetId = ''
    commentChangeset = ''
    isPushing = false
    uploadedOk = false
    featuresChanges = []
    basicPassword = null
    connectionError
    error: { status: number; message: string; feature: any }

    constructor(
        public dataService: DataService,
        public osmApi: OsmApiService,
        public tagsService: TagsService,
        public mapService: MapService,
        public navCtrl: NavController,
        private alertCtrl: AlertController,
        public configService: ConfigService,
        public platform: Platform,
        private translate: TranslateService,
        public initService: InitService
    ) {
        this.commentChangeset = this.configService.getChangeSetComment()
        this.featuresChanges = this.dataService.getGeojsonChanged().features
    }
    ngOnInit(): void {
        if (!this.initService.isLoaded) {
            // We need to instantiate the map
            this.navCtrl.back()
        }

        this.basicPassword = this.configService.user_info.password
    }

    ngOnDestroy(): void {}

    presentConfirm() {
        this.alertCtrl
            .create({
                header: this.translate.instant(
                    'SEND_DATA.DELETE_CONFIRM_HEADER'
                ),
                message: this.translate.instant(
                    'SEND_DATA.DELETE_CONFIRM_MESSAGE'
                ),
                buttons: [
                    {
                        text: this.translate.instant('SHARED.CANCEL'),
                        role: 'cancel',
                        handler: () => {},
                    },
                    {
                        text: this.translate.instant('SHARED.CONFIRM'),
                        handler: () => {
                            this.cancelAllFeatures()
                        },
                    },
                ],
            })
            .then((alert) => {
                alert.present()
            })
    }

    displayError(error) {
        this.alertCtrl
            .create({
                message: error,
                buttons: [
                    {
                        text: this.translate.instant('SHARED.CLOSE'),
                        role: 'cancel',
                        handler: () => {},
                    },
                ],
            })
            .then((alert) => {
                alert.present()
            })
    }

    getSummary() {
        const summary = { Total: 0, Create: 0, Update: 0, Delete: 0 }
        this.featuresChanges = this.dataService.getGeojsonChanged().features
        const featuresChanged = this.dataService.getGeojsonChanged().features

        for (let i = 0; i < featuresChanged.length; i++) {
            const featureChanged = featuresChanged[i]
            summary[featureChanged.properties.changeType]++
            summary['Total']++
        }
        return summary
    }

    // update Osm Go local data after success Diff push
    private updateLocalDataFromDiffResult(
        diffResults,
        oldFeaturesChanged
    ): void {
        for (const diff of diffResults) {
            const currentFeatureChanged = oldFeaturesChanged.find(
                (f) => f.id == diff.osmgoOldId
            )

            // let newFeature = {};
            let newFeature = cloneDeep(currentFeatureChanged)
            newFeature['id'] = `${diff.osmgoNewId ? diff.osmgoNewId : null}`
            newFeature['properties']['id'] = diff.new_id
                ? parseInt(diff.new_id)
                : null
            newFeature['properties']['meta']['version'] = diff.new_version
                ? diff.new_version
                : null
            newFeature['properties']['meta']['user'] =
                this.configService.getUserInfo().display_name
            newFeature['properties']['meta']['uid'] =
                this.configService.getUserInfo().uid
            newFeature['properties']['meta']['timestamp'] =
                new Date().toISOString()
            newFeature['properties']['time'] = new Date().getTime()
            if (newFeature['properties']['tags']['fixme']) {
                newFeature['properties']['fixme'] = true
            } else {
                if (newFeature['properties']['fixme'])
                    delete newFeature['properties']['fixme']
            }

            if (newFeature['properties']['deprecated']) {
                delete newFeature['properties']['deprecated']
            }
            delete newFeature['properties']['changeType']
            delete newFeature['properties']['originalData']

            newFeature = this.mapService.getIconStyle(newFeature) // style
            addAttributesToFeature(newFeature)

            if (diff.typeChange == 'Create') {
                newFeature = this.mapService.getIconStyle(newFeature) // style
                this.dataService.deleteFeatureFromGeojsonChanged(
                    currentFeatureChanged
                )
                this.dataService.addFeatureToGeojson(newFeature)
            } else if (diff.typeChange == 'Update') {
                newFeature = this.mapService.getIconStyle(newFeature) // style
                this.dataService.deleteFeatureFromGeojsonChanged(
                    currentFeatureChanged
                )
                // if theire is no tags, we don't add the feature
                if (Object.keys(newFeature['properties']['tags']).length > 0) {
                    this.dataService.addFeatureToGeojson(newFeature)
                }
            } else if (diff.typeChange == 'Delete') {
                this.dataService.deleteFeatureFromGeojsonChanged(
                    currentFeatureChanged
                )
            }
        }
    }

    async presentAlertPassword(user_info) {
        const alert = await this.alertCtrl.create({
            header: user_info.display_name,
            inputs: [
                {
                    name: 'password',
                    type: 'password',
                    placeholder: this.translate.instant(
                        'SEND_DATA.PASSWORD_OSM'
                    ),
                },
            ],
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel',
                    cssClass: 'secondary',
                    handler: () => {},
                },
                {
                    text: 'Ok',
                    handler: (e) => {
                        this.basicPassword = e.password
                        this.pushDataToOsm(
                            this.commentChangeset,
                            this.basicPassword
                        )
                    },
                },
            ],
        })

        await alert.present()
    }

    userIsConnected(password) {
        return new Promise((resolve, reject) => {
            this.osmApi
                .getUserDetail$(
                    this.configService.user_info.user,
                    password,
                    this.configService.user_info.authType === 'basic'
                        ? true
                        : false,
                    null,
                    true
                )
                .pipe(take(1))
                .subscribe(
                    (u) => {
                        resolve(true)
                    },
                    (err) => {
                        reject(err.error)
                        if (
                            this.configService.user_info.authType === 'basic' &&
                            !this.configService.user_info.password
                        ) {
                            this.basicPassword = null
                            this.isPushing = false
                        }
                    }
                )
        })
    }

    getFeatureFromErrorResult(status: number, message: string) {
        let resId
        if (status == 409) {
            // Version mismatch: Provided 3, server had: 4 of Node 4330909006
            const rRes = message.match(/(Node|Way|Relation)\s\d+$/)
            if (rRes) {
                const type = rRes[0].split(' ')[0].toLowerCase()
                const id = rRes[0].split(' ')[1]
                resId = type && id ? `${type}/${id}` : null
            }
        } else if (status == 410) {
            // The node with the id 4316641199 has already been deleted
            const rRes = message.match(
                /(node|way|relation)\swith\sthe\sid\s\d+/
            )
            const splited = rRes[0].split(' with the id ')
            const type = splited[0]
            const id = splited[1]
            resId = type && id ? `${type}/${id}` : null
        } else {
            return null
        }

        if (!resId) {
            return null
        }
        const feature = this.dataService
            .getGeojsonChanged()
            .features.find((f) => f.id == resId)
        return feature
    }

    async pushDataToOsm(commentChangeset, password) {
        if (this.isPushing) {
            return
        }

        await this.dataService.replaceIdGenerateByOldVersion()

        this.configService.setChangeSetComment(commentChangeset)

        if (
            this.configService.user_info.authType == 'basic' &&
            !this.basicPassword
        ) {
            this.mapService.isProcessing.next(false)
            await this.presentAlertPassword(this.configService.user_info)
            return
        }
        this.mapService.isProcessing.next(true)
        this.isPushing = true
        this.uploadedOk = false
        try {
            await this.userIsConnected(password)
        } catch (error) {
            this.connectionError = error
            if (
                this.configService.user_info.authType === 'basic' &&
                !this.configService.user_info.password
            ) {
                this.basicPassword = null
                this.isPushing = false
            }
            this.isPushing = false
            this.mapService.isProcessing.next(false)
            return
        }
        this.connectionError = undefined

        this.osmApi
            .getValidChangset(commentChangeset, password)
            .pipe(take(1))
            .subscribe((CS) => {
                const features = this.dataService.getGeojsonChanged().features
                this.changesetId = CS
                const diffFile = this.osmApi.osmGoFeaturesToOsmDiffFile(
                    features,
                    this.changesetId
                )

                this.osmApi
                    .apiOsmSendOsmDiffFile(diffFile, this.changesetId, password)
                    .pipe(take(1))
                    .subscribe({
                        next: (diffFileResult) => {
                            this.updateLocalDataFromDiffResult(
                                diffFileResult,
                                features
                            )
                            this.mapService.eventMarkerReDraw.emit(
                                this.dataService.getGeojson()
                            )
                            this.mapService.eventMarkerChangedReDraw.emit(
                                this.dataService.getGeojsonChanged()
                            )
                            this.featuresChanges =
                                this.dataService.getGeojsonChanged().features
                            this.error = undefined
                            this.summary = this.getSummary()
                            this.uploadedOk = true
                            this.mapService.isProcessing.next(false)
                            timer(1000)
                                .pipe(take(1))
                                .subscribe(() => {
                                    // this.isPushing = false;
                                    this.navCtrl.back()
                                })
                        },
                        error: (err) => {
                            const feature = this.getFeatureFromErrorResult(
                                err.status,
                                err.error
                            )
                            this.error = {
                                status: err.status,
                                message: err.error,
                                feature,
                            }
                            const featureWithError = {
                                ...this.featuresChanges.find(
                                    (f) => f.id == feature?.id
                                ),
                                error: err.error,
                            }
                            this.featuresChanges = [
                                featureWithError,
                                ...this.featuresChanges.filter(
                                    (f) => f.id !== feature?.id
                                ),
                            ]
                            this.isPushing = false
                            this.mapService.isProcessing.next(false)
                        },
                    })
            })
    }

    cancelErrorFeature(feature) {
        this.dataService.cancelFeatureChange(feature)
        this.featuresChanges = this.dataService.getGeojsonChanged().features
        this.mapService.eventMarkerReDraw.emit(this.dataService.getGeojson())
        this.mapService.eventMarkerChangedReDraw.emit(
            this.dataService.getGeojsonChanged()
        )
        this.error = undefined
    }

    async cancelAllFeatures() {
        // rollBack
        const featuresChanged = this.dataService.getGeojsonChanged().features
        for (let feature of featuresChanged) {
            this.dataService.cancelFeatureChange(feature)
        }
        await this.dataService.resetGeojsonChanged()
        this.summary = this.getSummary()
        this.featuresChanges = this.dataService.getGeojsonChanged().features
        timer(100)
            .pipe(take(1))
            .subscribe((t) => {
                this.mapService.eventMarkerReDraw.emit(
                    this.dataService.getGeojson()
                )
                this.mapService.eventMarkerChangedReDraw.emit(
                    this.dataService.getGeojsonChanged()
                )
                this.mapService.isProcessing.next(false)
                this.navCtrl.pop()
            })
    }

    centerToElement(pointCoordinates) {
        if (this.mapService.map.getZoom() < 18.5) {
            this.mapService.map.setZoom(18.5)
        }
        this.mapService.map.setCenter(pointCoordinates)
        this.navCtrl.pop()
    }

    ngAfterViewInit() {
        this.summary = this.getSummary()
    }
}
