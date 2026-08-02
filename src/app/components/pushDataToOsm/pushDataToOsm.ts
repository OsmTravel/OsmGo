import { KeyValuePipe } from '@angular/common'
import {
    type AfterViewInit,
    Component,
    InjectionToken,
    inject,
    type OnDestroy,
    signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSnackBar } from '@angular/material/snack-bar'
import { IconComponent } from '@components/icon/icon.component'
import {
    ConfirmDialogComponent,
    type ConfirmDialogData,
} from '@components/shared/confirm-dialog/confirm-dialog'
import { ScreenHeaderComponent } from '@components/shared/screen-header/screen-header'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { type OsmGoChangeType, OsmGoFeature } from '@osmgo/type'
import { addAttributesToFeature } from '@scripts/osmToOsmgo/index.js'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { MapService } from '@services/map.service'
import { OsmApiService, type OsmDiffResult } from '@services/osmApi.service'
import { OverlayNavigationService } from '@services/overlay-navigation.service'
import { TagsService } from '@services/tags.service'
import type { Geometry, Position } from 'geojson'
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

interface OsmRequestError {
    status?: unknown
    error?: unknown
    message?: unknown
}

interface SubmittedUpload {
    feature: UploadFeature
    operation: OsmGoChangeType
}

export const UPLOAD_SUCCESS_DELAY_MS = new InjectionToken<number>(
    'Upload success feedback delay',
    { factory: () => 1000 }
)

@Component({
    selector: 'page-push-data-to-osm',
    templateUrl: './pushDataToOsm.html',
    styleUrls: ['./pushDataToOsm.scss'],
    imports: [
        FormsModule,
        IconComponent,
        KeyValuePipe,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        ScreenHeaderComponent,
        TranslateModule,
    ],
})
export class PushDataToOsmPage implements AfterViewInit, OnDestroy {
    readonly dataService = inject(DataService)
    readonly osmApi = inject(OsmApiService)
    readonly tagsService = inject(TagsService)
    readonly mapService = inject(MapService)
    readonly configService = inject(ConfigService)
    private readonly translate = inject(TranslateService)
    private readonly dialog = inject(MatDialog)
    private readonly overlayNavigation = inject(OverlayNavigationService)
    private readonly snackBar = inject(MatSnackBar)
    private readonly successDelayMs = inject(UPLOAD_SUCCESS_DELAY_MS)

    readonly summary = signal<UploadSummary>({
        Total: 0,
        Create: 0,
        Update: 0,
        Delete: 0,
    })
    changesetId = ''
    readonly commentChangeset = signal(this.configService.getChangeSetComment())
    private readonly uploadInFlightState = signal(false)
    readonly uploadInFlight = this.uploadInFlightState.asReadonly()
    readonly isPushing = this.uploadInFlight
    readonly uploadStatusVisible = signal(false)
    readonly uploadedOk = signal(false)
    readonly featuresChanges = signal<UploadFeature[]>(
        this.dataService.getGeojsonChanged().features
    )
    readonly connectionError = signal<string | undefined>(undefined)
    readonly error = signal<UploadError | undefined>(undefined)
    private destroyed = false
    private closeStarted = false

    ngOnDestroy(): void {
        this.destroyed = true
    }

    back(): void {
        if (this.canCloseOverlay()) void this.closeOverlayOnce()
    }

    canCloseOverlay(): boolean {
        return !this.uploadInFlight()
    }

    presentConfirm(): void {
        const data: ConfirmDialogData = {
            title: this.translate.instant('SEND_DATA.DELETE_CONFIRM_HEADER'),
            message: this.translate.instant('SEND_DATA.DELETE_CONFIRM_MESSAGE'),
            cancelLabel: this.translate.instant('SHARED.CANCEL'),
            confirmLabel: this.translate.instant('SHARED.CONFIRM'),
            destructive: true,
        }
        this.dialog
            .open(ConfirmDialogComponent, {
                data,
                maxWidth: 'calc(100vw - 32px)',
                panelClass: 'osmgo-dialog',
            })
            .afterClosed()
            .subscribe((confirmed) => {
                if (confirmed) {
                    void this.cancelAllFeatures()
                }
            })
    }

    displayError(error: string): void {
        this.snackBar.open(error, this.translate.instant('SHARED.CLOSE'), {
            duration: 8000,
            panelClass: 'osmgo-error-snackbar',
        })
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
        if (
            !Array.isArray(diffResults) ||
            diffResults.length !== oldFeaturesChanged.length
        ) {
            throw new Error('OpenStreetMap returned an invalid upload result.')
        }

        const submittedById = new Map<string, SubmittedUpload>()
        for (const feature of oldFeaturesChanged) {
            const type = feature.properties.type
            const id = feature.properties.id
            const osmgoId = `${type}/${id}`
            if (
                !['node', 'way', 'relation'].includes(type) ||
                !Number.isInteger(id) ||
                id === 0 ||
                feature.id !== osmgoId ||
                submittedById.has(osmgoId)
            ) {
                throw new Error('The local OSM upload queue is invalid.')
            }
            submittedById.set(osmgoId, {
                feature,
                operation: this.getSubmittedOperation(feature),
            })
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
            const oldId = diff.osmgoOldId
            const submission = submittedById.get(oldId)
            if (
                typeof oldId !== 'string' ||
                !submission ||
                processedIds.has(oldId)
            ) {
                throw new Error(
                    'The OSM upload result does not match local data.'
                )
            }
            this.validateUploadReceipt(diff, submission)
            processedIds.add(oldId)

            const currentFeatureChanged = submission.feature
            if (currentFeatureChanged.properties.changeType === 'Delete') {
                preparedResults.push({ oldId })
                continue
            }

            let newFeature = cloneDeep(currentFeatureChanged)
            newFeature.id = diff.osmgoNewId!
            newFeature.properties.id = Number(diff.new_id)
            newFeature.properties.meta.version = diff.new_version!
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
                    currentFeatureChanged.properties.changeType === 'Create' ||
                    hasTags
                        ? newFeature
                        : undefined,
            })
        }

        if (processedIds.size !== submittedById.size) {
            throw new Error('OpenStreetMap returned an incomplete result.')
        }

        await this.dataService.applyUploadResults(preparedResults)
    }

    private getSubmittedOperation(feature: UploadFeature): OsmGoChangeType {
        const changeType = feature.properties.changeType
        if (
            changeType !== 'Create' &&
            changeType !== 'Update' &&
            changeType !== 'Delete'
        ) {
            throw new Error('The local OSM upload queue is invalid.')
        }
        const usedByWays = feature.properties.usedByWays
        if (
            changeType === 'Delete' &&
            (usedByWays === true ||
                (Array.isArray(usedByWays) && usedByWays.length > 0))
        ) {
            return 'Update'
        }
        return changeType
    }

    private validateUploadReceipt(
        diff: OsmDiffResult,
        submission: SubmittedUpload
    ): void {
        const feature = submission.feature
        const type = feature.properties.type
        const oldId = String(feature.properties.id)
        if (
            diff.type !== type ||
            diff.old_id !== oldId ||
            diff.osmgoOldId !== `${type}/${oldId}`
        ) {
            throw new Error('The OSM upload result does not match local data.')
        }

        if (submission.operation === 'Delete') {
            if (
                diff.new_id !== undefined ||
                diff.new_version !== undefined ||
                diff.osmgoNewId !== undefined
            ) {
                throw new Error(
                    'The OSM upload result does not match the submitted operation.'
                )
            }
            return
        }

        const newId = Number(diff.new_id)
        if (
            typeof diff.new_id !== 'string' ||
            !/^[1-9]\d*$/.test(diff.new_id) ||
            !Number.isSafeInteger(newId) ||
            typeof diff.new_version !== 'number' ||
            !Number.isInteger(diff.new_version) ||
            diff.new_version < 1 ||
            diff.osmgoNewId !== `${type}/${diff.new_id}`
        ) {
            throw new Error('OpenStreetMap returned an incomplete result.')
        }

        if (submission.operation === 'Create') {
            if (feature.properties.id >= 0 || diff.new_version !== 1) {
                throw new Error(
                    'The OSM upload result does not match the submitted operation.'
                )
            }
            return
        }

        if (
            feature.properties.id < 1 ||
            newId !== feature.properties.id ||
            diff.new_version !== feature.properties.meta.version + 1
        ) {
            throw new Error(
                'The OSM upload result does not match the submitted operation.'
            )
        }
    }

    async userIsConnected(): Promise<boolean> {
        try {
            await firstValueFrom(this.osmApi.getUserDetail$(true))
            return true
        } catch (error) {
            console.error(error)
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
        this.uploadStatusVisible.set(false)
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
        if (this.uploadInFlight()) {
            console.log('Already pushing')
            return
        }

        this.uploadInFlightState.set(true)
        this.uploadStatusVisible.set(true)
        this.uploadedOk.set(false)
        this.mapService.setIsProcessing(true)
        let uploadSucceeded = false
        let phase: 'prepare' | 'connection' | 'changeset' | 'diff' | 'persist' =
            'prepare'

        try {
            await this.dataService.replaceIdGenerateByOldVersion()
            this.configService.setChangeSetComment(commentChangeset)

            phase = 'connection'
            try {
                await this.userIsConnected()
            } catch (error) {
                this.connectionError.set(
                    typeof error === 'string'
                        ? error
                        : this.getOsmErrorMessage(error)
                )
                this.uploadStatusVisible.set(false)
                return
            }
            this.connectionError.set(undefined)

            phase = 'changeset'
            const changesetId = await firstValueFrom(
                this.osmApi.getValidChangeset(commentChangeset).pipe(take(1))
            )
            const features = this.dataService.getGeojsonChanged().features
            this.changesetId = changesetId
            const diffFile = this.osmApi.osmGoFeaturesToOsmDiffFile(
                features,
                this.changesetId
            )

            phase = 'diff'
            const diffFileResult = await firstValueFrom(
                this.osmApi
                    .apiOsmSendOsmDiffFile(diffFile, this.changesetId)
                    .pipe(take(1))
            )

            phase = 'persist'
            await this.updateLocalDataFromDiffResult(diffFileResult, features)
            this.mapService.redrawMarkers(this.dataService.getGeojson())
            this.mapService.redrawChangedMarkers(
                this.dataService.getGeojsonChanged()
            )
            this.featuresChanges.set(
                this.dataService.getGeojsonChanged().features
            )
            this.error.set(undefined)
            this.summary.set(this.getSummary())
            this.uploadedOk.set(true)
            uploadSucceeded = true
        } catch (error) {
            const message = this.getOsmErrorMessage(error)
            if (this.isClosedChangesetError(error)) {
                this.configService.invalidateChangeset()
                this.stopPushingWithError({
                    ...(typeof error === 'object' && error !== null
                        ? error
                        : {}),
                    error: `${message} Please retry to create a new changeset.`,
                })
            } else {
                const details = this.getOsmRequestError(error)
                const feature =
                    phase === 'diff'
                        ? this.getFeatureFromErrorResult(
                              typeof details.status === 'number'
                                  ? details.status
                                  : 0,
                              message
                          )
                        : null
                this.stopPushingWithError(error, feature)
                if (feature) {
                    const failedFeature = this.featuresChanges().find(
                        (item) => item.id === feature.id
                    )
                    if (failedFeature) {
                        this.featuresChanges.set([
                            { ...failedFeature, error: message },
                            ...this.featuresChanges().filter(
                                (item) => item.id !== feature.id
                            ),
                        ])
                    }
                }
            }
        } finally {
            this.finishUploadAttempt()
        }

        if (!uploadSucceeded) return

        await firstValueFrom(timer(this.successDelayMs).pipe(take(1)))
        this.uploadStatusVisible.set(false)
        if (!this.destroyed) {
            await this.closeOverlayOnce()
        }
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
                this.back()
            })
    }

    centerToElement(geometry: OsmGoFeature['geometry']): void {
        if (geometry.type === 'Point') {
            const [longitude, latitude] = geometry.coordinates
            if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
                return
            }
            if (this.mapService.map.getZoom() < 18.5) {
                this.mapService.map.setZoom(18.5)
            }
            this.mapService.map.setCenter([longitude, latitude])
        } else {
            const bounds = this.geometryBounds(geometry)
            if (!bounds) return
            this.mapService.map.fitBounds(bounds, {
                maxZoom: 18.5,
                padding: 48,
            })
        }
        this.back()
    }

    private geometryBounds(
        geometry: Exclude<Geometry, { type: 'Point' }>
    ): [[number, number], [number, number]] | null {
        const positions: Position[] = []
        const collectPositions = (value: unknown): void => {
            if (
                Array.isArray(value) &&
                value.length >= 2 &&
                typeof value[0] === 'number' &&
                typeof value[1] === 'number' &&
                Number.isFinite(value[0]) &&
                Number.isFinite(value[1])
            ) {
                positions.push(value as Position)
                return
            }
            if (Array.isArray(value)) {
                for (const child of value) collectPositions(child)
            }
        }

        if (geometry.type === 'GeometryCollection') {
            for (const child of geometry.geometries) {
                if (child.type === 'Point') {
                    collectPositions(child.coordinates)
                } else {
                    const childBounds = this.geometryBounds(child)
                    if (childBounds) collectPositions(childBounds)
                }
            }
        } else {
            collectPositions(geometry.coordinates)
        }
        if (positions.length === 0) return null

        let west = positions[0][0]
        let east = positions[0][0]
        let south = positions[0][1]
        let north = positions[0][1]
        for (const [longitude, latitude] of positions.slice(1)) {
            west = Math.min(west, longitude)
            east = Math.max(east, longitude)
            south = Math.min(south, latitude)
            north = Math.max(north, latitude)
        }
        return [
            [west, south],
            [east, north],
        ]
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

    private finishUploadAttempt(): void {
        this.uploadInFlightState.set(false)
        this.mapService.setIsProcessing(false)
    }

    private async closeOverlayOnce(): Promise<void> {
        if (this.closeStarted) return
        this.closeStarted = true
        await this.overlayNavigation.close()
    }
}
