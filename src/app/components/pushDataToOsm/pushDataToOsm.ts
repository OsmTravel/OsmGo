import {
    Component,
    AfterViewInit,
    OnInit,
    OnDestroy,
    ChangeDetectionStrategy,
} from '@angular/core'

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
import { OsmGoFeature } from '@osmgo/type'

@Component({
    selector: 'page-push-data-to-osm',
    templateUrl: './pushDataToOsm.html',
    styleUrls: ['./pushDataToOsm.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
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
    private async updateLocalDataFromDiffResult(
        diffResults,
        oldFeaturesChanged
    ): Promise<void> {
        if (!Array.isArray(diffResults)) {
            throw new Error('OpenStreetMap returned an invalid upload result.')
        }

        const preparedResults = []
        const processedIds = new Set<string>()
        for (const diff of diffResults) {
            const oldId = diff?.osmgoOldId
            const currentFeatureChanged = oldFeaturesChanged.find(
                (f) => f.id == oldId
            )
            if (
                !currentFeatureChanged ||
                processedIds.has(oldId) ||
                !['Create', 'Update', 'Delete'].includes(diff.typeChange)
            ) {
                throw new Error(
                    'The OSM upload result does not match local data.'
                )
            }
            processedIds.add(oldId)

            if (diff.typeChange === 'Delete') {
                preparedResults.push({ oldId })
                continue
            }

            if (
                !diff.osmgoNewId ||
                diff.new_id == null ||
                diff.new_version == null
            ) {
                throw new Error('OpenStreetMap returned an incomplete result.')
            }

            let newFeature = cloneDeep(currentFeatureChanged)
            newFeature['id'] = diff.osmgoNewId
            newFeature['properties']['id'] = Number(diff.new_id)
            newFeature['properties']['meta']['version'] = diff.new_version
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

            const hasTags =
                Object.keys(newFeature['properties']['tags']).length > 0
            preparedResults.push({
                oldId,
                feature:
                    diff.typeChange === 'Create' || hasTags
                        ? newFeature
                        : undefined,
            })
        }

        await this.dataService.applyUploadResults(preparedResults)
    }

    userIsConnected() {
        return new Promise((resolve, reject) => {
            this.osmApi
                .getUserDetail$(true)
                .pipe(take(1))
                .subscribe(
                    (u) => {
                        resolve(true)
                    },
                    (err) => {
                        console.error(err)
                        reject(this.getOsmErrorMessage(err))
                        this.isPushing = false
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

    private getOsmErrorMessage(error): string {
        if (typeof error?.error === 'string' && error.error.trim()) {
            return error.error
        }
        if (typeof error?.message === 'string' && error.message.trim()) {
            return error.message
        }
        return 'OpenStreetMap could not process the request.'
    }

    private stopPushingWithError(error, feature = null): void {
        this.error = {
            status: typeof error?.status === 'number' ? error.status : 0,
            message: this.getOsmErrorMessage(error),
            feature,
        }
        this.isPushing = false
        this.mapService.isProcessing.next(false)
    }

    private isClosedChangesetError(error): boolean {
        if (error?.status !== 409 || typeof error.error !== 'string') {
            return false
        }

        const match = error.error
            .trim()
            .match(/^The changeset (\d+) was closed at .+\.?$/)
        return match?.[1] === String(this.changesetId)
    }

    async pushDataToOsm(commentChangeset) {
        if (this.isPushing) {
            console.log('Already pushing')
            return
        }

        this.isPushing = true
        this.mapService.isProcessing.next(true)

        try {
            await this.dataService.replaceIdGenerateByOldVersion()
        } catch (error) {
            this.stopPushingWithError(error)
            return
        }

        this.configService.setChangeSetComment(commentChangeset)

        this.uploadedOk = false
        try {
            await this.userIsConnected()
        } catch (error) {
            this.connectionError = error
            this.isPushing = false
            this.mapService.isProcessing.next(false)
            return
        }
        this.connectionError = undefined

        this.osmApi
            .getValidChangset(commentChangeset)
            .pipe(take(1))
            .subscribe(
                (CS) => {
                    const features =
                        this.dataService.getGeojsonChanged().features
                    this.changesetId = CS
                    const diffFile = this.osmApi.osmGoFeaturesToOsmDiffFile(
                        features,
                        this.changesetId
                    )

                    this.osmApi
                        .apiOsmSendOsmDiffFile(diffFile, this.changesetId)
                        .pipe(take(1))
                        .subscribe({
                            next: async (diffFileResult) => {
                                try {
                                    await this.updateLocalDataFromDiffResult(
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
                                            this.navCtrl.back()
                                        })
                                } catch (error) {
                                    this.stopPushingWithError(error)
                                }
                            },
                            error: (err) => {
                                const message = this.getOsmErrorMessage(err)
                                if (this.isClosedChangesetError(err)) {
                                    this.configService.invalidateChangeset()
                                    this.stopPushingWithError({
                                        ...err,
                                        error: `${message} Please retry to create a new changeset.`,
                                    })
                                    return
                                }
                                const feature = this.getFeatureFromErrorResult(
                                    err.status,
                                    message
                                )
                                this.stopPushingWithError(err, feature)
                                if (feature) {
                                    const featureWithError = {
                                        ...this.featuresChanges.find(
                                            (f) => f.id == feature.id
                                        ),
                                        error: message,
                                    }
                                    this.featuresChanges = [
                                        featureWithError,
                                        ...this.featuresChanges.filter(
                                            (f) => f.id !== feature.id
                                        ),
                                    ]
                                }
                            },
                        })
                },
                (err) => {
                    this.stopPushingWithError(err)
                }
            )
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
