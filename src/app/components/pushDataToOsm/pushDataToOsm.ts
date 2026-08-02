import { KeyValuePipe } from '@angular/common'
import {
    type AfterViewInit,
    Component,
    inject,
    type OnDestroy,
    type OnInit,
    signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IconComponent } from '@components/icon/icon.component'

import {
    AlertController,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonTitle,
    IonToolbar,
    NavController,
    Platform,
} from '@ionic/angular/standalone'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { type OsmGoChangeType, OsmGoFeature } from '@osmgo/type'
import { addAttributesToFeature } from '@scripts/osmToOsmgo/index.js'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { InitService } from '@services/init.service'
import { MapService } from '@services/map.service'
import { OsmApiService } from '@services/osmApi.service'
import { TagsService } from '@services/tags.service'
import { cloneDeep } from 'lodash'
import { firstValueFrom, timer } from 'rxjs'
import { take } from 'rxjs/operators'

interface UploadSummary {
    Total: number
    Create: number
    Update: number
    Delete: number
}

type UploadFeature = OsmGoFeature & {
    error?: string
}

interface UploadError {
    status: number
    message: string
    feature: UploadFeature | null
}

interface OsmDiffResult {
    typeChange?: OsmGoChangeType
    osmgoOldId?: string
    osmgoNewId?: string
    new_id?: string | number
    new_version?: number
}

interface OsmRequestError {
    status?: unknown
    error?: unknown
    message?: unknown
}

@Component({
    selector: 'page-push-data-to-osm',
    templateUrl: './pushDataToOsm.html',
    styleUrls: ['./pushDataToOsm.scss'],
    imports: [
        FormsModule,
        IconComponent,
        IonButton,
        IonButtons,
        IonCard,
        IonCardContent,
        IonCardHeader,
        IonContent,
        IonFooter,
        IonHeader,
        IonIcon,
        IonInput,
        IonItem,
        IonTitle,
        IonToolbar,
        KeyValuePipe,
        TranslateModule,
    ],
})
export class PushDataToOsmPage implements AfterViewInit, OnInit, OnDestroy {
    readonly dataService = inject(DataService)
    readonly osmApi = inject(OsmApiService)
    readonly tagsService = inject(TagsService)
    readonly mapService = inject(MapService)
    readonly navCtrl = inject(NavController)
    private readonly alertCtrl = inject(AlertController)
    readonly configService = inject(ConfigService)
    readonly platform = inject(Platform)
    private readonly translate = inject(TranslateService)
    readonly initService = inject(InitService)

    readonly summary = signal<UploadSummary>({
        Total: 0,
        Create: 0,
        Update: 0,
        Delete: 0,
    })
    changesetId = ''
    readonly commentChangeset = signal(this.configService.getChangeSetComment())
    readonly isPushing = signal(false)
    readonly uploadedOk = signal(false)
    readonly featuresChanges = signal<UploadFeature[]>(
        this.dataService.getGeojsonChanged().features
    )
    readonly connectionError = signal<string | undefined>(undefined)
    readonly error = signal<UploadError | undefined>(undefined)
    ngOnInit(): void {
        if (!this.initService.isLoaded) {
            // We need to instantiate the map
            this.navCtrl.back()
        }
    }

    ngOnDestroy(): void {
        // An acknowledged upload must finish even if the page is backgrounded.
    }

    async presentConfirm(): Promise<void> {
        const alert = await this.alertCtrl.create({
            header: this.translate.instant('SEND_DATA.DELETE_CONFIRM_HEADER'),
            message: this.translate.instant('SEND_DATA.DELETE_CONFIRM_MESSAGE'),
            buttons: [
                {
                    text: this.translate.instant('SHARED.CANCEL'),
                    role: 'cancel',
                    handler: () => {},
                },
                {
                    text: this.translate.instant('SHARED.CONFIRM'),
                    handler: () => {
                        void this.cancelAllFeatures()
                    },
                },
            ],
        })
        await alert.present()
    }

    async displayError(error: string): Promise<void> {
        const alert = await this.alertCtrl.create({
            message: error,
            buttons: [
                {
                    text: this.translate.instant('SHARED.CLOSE'),
                    role: 'cancel',
                    handler: () => {},
                },
            ],
        })
        await alert.present()
    }

    getSummary(): UploadSummary {
        const summary: UploadSummary = {
            Total: 0,
            Create: 0,
            Update: 0,
            Delete: 0,
        }
        this.featuresChanges.set(this.dataService.getGeojsonChanged().features)
        const featuresChanged = this.dataService.getGeojsonChanged().features

        for (let i = 0; i < featuresChanged.length; i++) {
            const featureChanged = featuresChanged[i]
            const changeType = featureChanged.properties.changeType
            if (changeType) {
                summary[changeType]++
            }
            summary.Total++
        }
        return summary
    }

    private async updateLocalDataFromDiffResult(
        diffResults: unknown,
        oldFeaturesChanged: UploadFeature[]
    ): Promise<void> {
        if (!Array.isArray(diffResults)) {
            throw new Error('OpenStreetMap returned an invalid upload result.')
        }

        const preparedResults: Array<{
            oldId: string
            feature?: OsmGoFeature
        }> = []
        const processedIds = new Set<string>()
        for (const result of diffResults) {
            if (!result || typeof result !== 'object') {
                throw new Error(
                    'OpenStreetMap returned an invalid upload result.'
                )
            }
            const diff = result as OsmDiffResult
            const oldId = diff?.osmgoOldId
            const typeChange = diff.typeChange
            const currentFeatureChanged = oldFeaturesChanged.find(
                (feature) => feature.id === oldId
            )
            if (
                typeof oldId !== 'string' ||
                !currentFeatureChanged ||
                processedIds.has(oldId) ||
                (typeChange !== 'Create' &&
                    typeChange !== 'Update' &&
                    typeChange !== 'Delete')
            ) {
                throw new Error(
                    'The OSM upload result does not match local data.'
                )
            }
            processedIds.add(oldId)

            if (typeChange === 'Delete') {
                preparedResults.push({ oldId })
                continue
            }

            if (
                !diff.osmgoNewId ||
                diff.new_id === null ||
                diff.new_id === undefined ||
                diff.new_version === null ||
                diff.new_version === undefined
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
            newFeature.properties.time = Date.now()
            if (newFeature.properties.tags.fixme) {
                newFeature.properties.fixme = true
            } else {
                delete newFeature.properties.fixme
            }

            delete newFeature.properties.deprecated
            delete newFeature.properties.changeType
            delete newFeature.properties.originalData

            newFeature = this.mapService.getIconStyle(newFeature) // style
            addAttributesToFeature(newFeature)

            const hasTags =
                Object.keys(newFeature['properties']['tags']).length > 0
            preparedResults.push({
                oldId,
                feature:
                    typeChange === 'Create' || hasTags ? newFeature : undefined,
            })
        }

        await this.dataService.applyUploadResults(preparedResults)
    }

    async userIsConnected(): Promise<boolean> {
        try {
            await firstValueFrom(this.osmApi.getUserDetail$(true))
            return true
        } catch (error) {
            console.error(error)
            this.isPushing.set(false)
            throw this.getOsmErrorMessage(error)
        }
    }

    getFeatureFromErrorResult(
        status: number,
        message: string
    ): UploadFeature | null {
        let resId: string | null | undefined
        if (status === 409) {
            // Version mismatch: Provided 3, server had: 4 of Node 4330909006
            const rRes = message.match(/(Node|Way|Relation)\s\d+$/)
            if (rRes) {
                const type = rRes[0].split(' ')[0].toLowerCase()
                const id = rRes[0].split(' ')[1]
                resId = type && id ? `${type}/${id}` : null
            }
        } else if (status === 410) {
            // The node with the id 4316641199 has already been deleted
            const rRes = message.match(
                /(node|way|relation)\swith\sthe\sid\s\d+/
            )
            if (!rRes) {
                return null
            }
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
            .features.find((feature) => feature.id === resId)
        return feature ?? null
    }

    private getOsmErrorMessage(error: unknown): string {
        const details = this.getOsmRequestError(error)
        if (typeof details.error === 'string' && details.error.trim()) {
            return details.error
        }
        if (typeof details.message === 'string' && details.message.trim()) {
            return details.message
        }
        return 'OpenStreetMap could not process the request.'
    }

    private stopPushingWithError(
        error: unknown,
        feature: UploadFeature | null = null
    ): void {
        const details = this.getOsmRequestError(error)
        this.error.set({
            status: typeof details.status === 'number' ? details.status : 0,
            message: this.getOsmErrorMessage(error),
            feature,
        })
        this.isPushing.set(false)
        this.mapService.setIsProcessing(false)
    }

    private isClosedChangesetError(error: unknown): boolean {
        const details = this.getOsmRequestError(error)
        if (details.status !== 409 || typeof details.error !== 'string') {
            return false
        }

        const match = details.error
            .trim()
            .match(/^The changeset (\d+) was closed at .+\.?$/)
        return match?.[1] === String(this.changesetId)
    }

    async pushDataToOsm(commentChangeset: string): Promise<void> {
        if (this.isPushing()) {
            console.log('Already pushing')
            return
        }

        this.isPushing.set(true)
        this.mapService.setIsProcessing(true)

        try {
            await this.dataService.replaceIdGenerateByOldVersion()
        } catch (error) {
            this.stopPushingWithError(error)
            return
        }

        this.configService.setChangeSetComment(commentChangeset)

        this.uploadedOk.set(false)
        try {
            await this.userIsConnected()
        } catch (error) {
            this.connectionError.set(
                typeof error === 'string'
                    ? error
                    : this.getOsmErrorMessage(error)
            )
            this.isPushing.set(false)
            this.mapService.setIsProcessing(false)
            return
        }
        this.connectionError.set(undefined)

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
                                    this.mapService.redrawMarkers(
                                        this.dataService.getGeojson()
                                    )
                                    this.mapService.redrawChangedMarkers(
                                        this.dataService.getGeojsonChanged()
                                    )
                                    this.featuresChanges.set(
                                        this.dataService.getGeojsonChanged()
                                            .features
                                    )
                                    this.error.set(undefined)
                                    this.summary.set(this.getSummary())
                                    this.uploadedOk.set(true)
                                    this.mapService.setIsProcessing(false)
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
                                    const failedFeature =
                                        this.featuresChanges().find(
                                            (item) => item.id === feature.id
                                        )
                                    if (failedFeature) {
                                        this.featuresChanges.set([
                                            {
                                                ...failedFeature,
                                                error: message,
                                            },
                                            ...this.featuresChanges().filter(
                                                (item) => item.id !== feature.id
                                            ),
                                        ])
                                    }
                                }
                            },
                        })
                },
                (err) => {
                    this.stopPushingWithError(err)
                }
            )
    }

    cancelErrorFeature(feature: OsmGoFeature): void {
        this.dataService.cancelFeatureChange(feature)
        this.featuresChanges.set(this.dataService.getGeojsonChanged().features)
        this.mapService.redrawMarkers(this.dataService.getGeojson())
        this.mapService.redrawChangedMarkers(
            this.dataService.getGeojsonChanged()
        )
        this.error.set(undefined)
    }

    async cancelAllFeatures(): Promise<void> {
        const featuresChanged = this.dataService.getGeojsonChanged().features
        for (const feature of featuresChanged) {
            this.dataService.cancelFeatureChange(feature)
        }
        await this.dataService.resetGeojsonChanged()
        this.summary.set(this.getSummary())
        this.featuresChanges.set(this.dataService.getGeojsonChanged().features)
        timer(100)
            .pipe(take(1))
            .subscribe(() => {
                this.mapService.redrawMarkers(this.dataService.getGeojson())
                this.mapService.redrawChangedMarkers(
                    this.dataService.getGeojsonChanged()
                )
                this.mapService.setIsProcessing(false)
                this.navCtrl.pop()
            })
    }

    centerToElement(geometry: OsmGoFeature['geometry']): void {
        if (!('coordinates' in geometry)) {
            return
        }
        if (this.mapService.map.getZoom() < 18.5) {
            this.mapService.map.setZoom(18.5)
        }
        this.mapService.map.setCenter(geometry.coordinates as [number, number])
        this.navCtrl.pop()
    }

    ngAfterViewInit(): void {
        this.summary.set(this.getSummary())
    }

    private getOsmRequestError(error: unknown): OsmRequestError {
        if (typeof error === 'object' && error !== null) {
            return error as OsmRequestError
        }
        return {}
    }
}
