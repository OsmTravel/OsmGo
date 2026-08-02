import { KeyValuePipe } from '@angular/common'
import {
    type AfterViewInit,
    Component,
    computed,
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
import type { OsmGoFeature } from '@osmgo/type'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { MapService } from '@services/map.service'
import { OverlayNavigationService } from '@services/overlay-navigation.service'
import { TagsService } from '@services/tags.service'
import {
    UploadCoordinatorService,
    type UploadFailure,
    type UploadFeature,
    type UploadSummary,
} from '@services/upload-coordinator.service'
import type { Geometry, Position } from 'geojson'
import { firstValueFrom, timer } from 'rxjs'
import { take } from 'rxjs/operators'

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
    readonly tagsService = inject(TagsService)
    readonly mapService = inject(MapService)
    readonly configService = inject(ConfigService)
    readonly uploadCoordinator = inject(UploadCoordinatorService)
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
    readonly commentChangeset = signal(this.configService.getChangeSetComment())
    readonly uploadInFlight = this.uploadCoordinator.inFlight
    readonly isPushing = this.uploadInFlight
    readonly uploadStatusVisible = signal(false)
    readonly uploadedOk = computed(
        () => this.uploadCoordinator.state().kind === 'succeeded'
    )
    readonly featuresChanges = signal<UploadFeature[]>(
        this.dataService.getGeojsonChanged().features
    )
    private readonly localError = signal<UploadFailure | undefined>(undefined)
    readonly connectionError = computed(() => {
        const state = this.uploadCoordinator.state()
        return state.kind === 'failed' && state.stage === 'connection'
            ? state.error.message
            : undefined
    })
    readonly error = computed(() => {
        const localError = this.localError()
        if (localError) return localError
        const state = this.uploadCoordinator.state()
        return state.kind === 'failed' ? state.error : undefined
    })
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
                if (confirmed) void this.cancelAllFeatures()
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
        const features = this.dataService.getGeojsonChanged().features
        this.featuresChanges.set(features)
        for (const feature of features) {
            const changeType = feature.properties.changeType
            if (
                changeType === 'Create' ||
                changeType === 'Update' ||
                changeType === 'Delete'
            ) {
                summary[changeType]++
            }
            summary.Total++
        }
        return summary
    }

    async pushDataToOsm(commentChangeset: string): Promise<void> {
        if (this.uploadInFlight()) return

        this.localError.set(undefined)
        this.uploadStatusVisible.set(true)
        const state = await this.uploadCoordinator.start(commentChangeset)
        this.featuresChanges.set(this.dataService.getGeojsonChanged().features)
        this.summary.set(this.getSummary())

        if (state.kind === 'failed') {
            this.uploadStatusVisible.set(false)
            const failedFeature = state.error.feature
            if (failedFeature) {
                this.featuresChanges.set([
                    { ...failedFeature, error: state.error.message },
                    ...this.featuresChanges().filter(
                        (feature) => feature.id !== failedFeature.id
                    ),
                ])
            }
            return
        }
        if (state.kind !== 'succeeded') return

        await firstValueFrom(timer(this.successDelayMs).pipe(take(1)))
        this.uploadStatusVisible.set(false)
        if (!this.destroyed) await this.closeOverlayOnce()
    }

    async cancelErrorFeature(feature: OsmGoFeature): Promise<void> {
        try {
            await this.dataService.cancelPendingChange(String(feature.id))
        } catch (error) {
            this.setLocalError(error, feature)
            return
        }
        this.refreshMapAndQueue()
        this.localError.set(undefined)
        this.uploadCoordinator.resetTerminalState()
    }

    async cancelAllFeatures(): Promise<void> {
        try {
            await this.dataService.cancelAllPendingChanges()
        } catch (error) {
            this.setLocalError(error)
            return
        }
        this.refreshMapAndQueue()
        this.summary.set(this.getSummary())
        this.localError.set(undefined)
        this.uploadCoordinator.resetTerminalState()
        this.back()
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

    private setLocalError(
        error: unknown,
        feature: OsmGoFeature | null = null
    ): void {
        const details =
            typeof error === 'object' && error !== null
                ? (error as {
                      status?: unknown
                      error?: unknown
                      message?: unknown
                  })
                : {}
        const message =
            typeof details.error === 'string' && details.error.trim()
                ? details.error
                : typeof details.message === 'string' && details.message.trim()
                  ? details.message
                  : error instanceof Error && error.message.trim()
                    ? error.message
                    : 'The local changes could not be updated.'
        this.localError.set({
            status: typeof details.status === 'number' ? details.status : 0,
            message,
            feature,
            queuePreserved: true,
            canClose: true,
            canRetry: true,
            recoveryAction: 'retry',
        })
        this.uploadStatusVisible.set(false)
    }

    private refreshMapAndQueue(): void {
        this.featuresChanges.set(this.dataService.getGeojsonChanged().features)
        this.mapService.redrawMarkers(this.dataService.getGeojson())
        this.mapService.redrawChangedMarkers(
            this.dataService.getGeojsonChanged()
        )
    }

    private async closeOverlayOnce(): Promise<void> {
        if (this.closeStarted) return
        this.closeStarted = true
        await this.overlayNavigation.close()
    }
}
