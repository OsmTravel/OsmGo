import { CdkTrapFocus } from '@angular/cdk/a11y'
import {
    type AfterViewInit,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    HostListener,
    inject,
    type OnDestroy,
    type OnInit,
    signal,
    viewChild,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router'
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker'
import { OsmAuthService } from '@app/services/osm-auth.service'
import { App as CapacitorApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { DialogMultiFeaturesComponent } from '@components/dialog-multi-features/dialog-multi-features.component'
import { MenuPage } from '@components/menu/menu'
import type { ModalDismissData } from '@components/modal/modal'
import {
    ConfirmDialogComponent,
    type ConfirmDialogData,
} from '@components/shared/confirm-dialog/confirm-dialog'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import type {
    EventShowModal,
    FeatureIdSource,
    OsmGoFeatureCollection,
} from '@osmgo/type'
import { AlertService } from '@services/alert.service'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { InitService } from '@services/init.service'
import { LocationService } from '@services/location.service'
import { MapService } from '@services/map.service'
import { OsmApiService } from '@services/osmApi.service'
import { OverlayNavigationService } from '@services/overlay-navigation.service'
import { TagsService } from '@services/tags.service'
import type { BBox } from 'geojson'
import { LngLat } from 'maplibre-gl'
import { EMPTY, from, type Observable, take, timer } from 'rxjs'
import { catchError, filter, finalize, map, switchMap } from 'rxjs/operators'
import { MapControlsComponent } from './map-controls/map-controls'
import {
    ObjectSheetComponent,
    type ObjectSheetLevel,
} from './object-sheet/object-sheet'

interface MapDataResult {
    geojson: OsmGoFeatureCollection
    geojsonBbox: OsmGoFeatureCollection
}

type OverlaySize = 'compact' | 'standard' | 'wide'

interface RouteOverlayContent {
    canCloseOverlay?: () => boolean
}

@Component({
    templateUrl: './main.html',
    selector: 'main',
    styleUrls: ['./main.scss'],
    imports: [
        CdkTrapFocus,
        MapControlsComponent,
        MenuPage,
        ObjectSheetComponent,
        RouterOutlet,
        TranslateModule,
    ],
})
export class MainPage implements AfterViewInit, OnDestroy, OnInit {
    readonly osmApi = inject(OsmApiService)
    readonly tagsService = inject(TagsService)
    readonly mapService = inject(MapService)
    readonly dataService = inject(DataService)
    readonly locationService = inject(LocationService)
    readonly alertService = inject(AlertService)
    readonly configService = inject(ConfigService)
    private readonly router = inject(Router)
    readonly translate = inject(TranslateService)
    private readonly swUpdate = inject(SwUpdate)
    readonly initService = inject(InitService)
    private readonly osmAuthService = inject(OsmAuthService)
    private readonly route = inject(ActivatedRoute)
    private readonly destroyRef = inject(DestroyRef)
    private readonly dialog = inject(MatDialog)
    private readonly snackBar = inject(MatSnackBar)
    private readonly overlayNavigation = inject(OverlayNavigationService)
    private pendingAuthCallbackUrl: string | null = null
    private authCallbackInProgress = false
    private initialDataLoaded = false
    private tokenLoaded = Promise.resolve<string | null>(null)

    readonly menuIsOpen = signal(false)
    readonly newVersion = signal(false)
    readonly overlayOpen = signal(false)
    readonly overlaySize = signal<OverlaySize>('standard')
    readonly selectedFeature = signal<EventShowModal | null>(null)
    private readonly readBeforeEdit = signal<EventShowModal | null>(null)
    readonly displayedSelection = computed(() =>
        this.mapService.markerMoveMoving() ? null : this.selectedFeature()
    )
    readonly sheetLevel = signal<ObjectSheetLevel>('medium')
    readonly mapControlsBottom = computed(() => {
        if (
            this.mapService.markerMoving() ||
            this.mapService.markerMoveMoving()
        ) {
            return 'max(46px, calc(env(safe-area-inset-bottom) + 42px))'
        }
        if (!this.selectedFeature()) {
            return 'max(46px, calc(env(safe-area-inset-bottom) + 42px))'
        }
        if (this.sheetLevel() === 'collapsed') {
            return '164px'
        }
        if (this.sheetLevel() === 'expanded') {
            return 'calc(100dvh + 24px)'
        }
        return 'calc(min(49dvh, 430px) + 12px)'
    })
    centerOnStart?: number[]
    zoomOnStart?: number
    loadOsmDataOnStart = false
    idOsmObjectOnStart?: string
    addOsmObjectOnStart?: {
        coords: LngLat
        tags: Record<string, string | number>
    }
    private resizeObserver?: ResizeObserver
    private backButtonListener?: PluginListenerHandle
    private activeOverlayContent?: RouteOverlayContent
    private initializeHistory(): void {
        window.history.pushState({ noBackExitsApp: true }, '')
    }
    private readonly handlePopState = (): void => {
        window.history.pushState({ noBackExitsApp: true }, '')
        if (this.overlayOpen()) {
            this.closeOverlay()
        } else if (this.menuIsOpen()) {
            this.closeMenu()
        } else if (this.selectedFeature()) {
            this.objectSheet()?.requestExit()
        }
    }

    readonly mapElement = viewChild.required<ElementRef<HTMLElement>>('map')
    readonly objectSheet = viewChild<ObjectSheetComponent>('objectSheet')

    // authType = this.platform.platforms().includes('hybrid') ? 'basic' : 'oauth'

    constructor() {
        this.mapService.featureChoiceRequested$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((features) => {
                if (
                    this.selectedFeature()?.type === 'Update' ||
                    this.selectedFeature()?.type === 'Create'
                ) {
                    return
                }
                const dialogRef = this.dialog.open(
                    DialogMultiFeaturesComponent,
                    {
                        autoFocus: 'dialog',
                        maxWidth: 'calc(100vw - 24px)',
                        panelClass: [
                            'osmgo-dialog',
                            'osmgo-feature-choice-dialog',
                        ],
                    }
                )
                dialogRef.componentRef?.setInput('features', features)
                dialogRef.componentRef?.setInput(
                    'jsonSprites',
                    this.tagsService.jsonSprites()
                )

                dialogRef.afterClosed().subscribe((feature) => {
                    if (feature) {
                        this.mapService.selectFeature(feature)
                    }
                })
            })

        this.mapService.mapBackgroundClick$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                if (this.selectedFeature()?.type === 'Read') {
                    this.closeSelection()
                }
            })

        this.mapService.showModal$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((_data) => {
                const current = this.selectedFeature()
                if (
                    (current?.type === 'Update' ||
                        current?.type === 'Create') &&
                    _data.type === 'Read'
                ) {
                    return
                }
                if (_data.type === 'Update' && current?.type === 'Read') {
                    this.readBeforeEdit.set(current)
                } else if (_data.type === 'Create' || _data.type === 'Read') {
                    this.readBeforeEdit.set(null)
                }
                this.selectedFeature.set(_data)
                this.sheetLevel.set(
                    _data.type === 'Read' && !_data.newPosition
                        ? 'medium'
                        : 'expanded'
                )
            })

        this.alertService.newAlert$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((alert) => {
                void this.presentToast(alert)
            })
    }

    ngOnInit(): void {
        this.route.queryParams
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((params) => {
                if (params['code'] || params['state'] || params['error']) {
                    if (!this.authCallbackInProgress) {
                        this.pendingAuthCallbackUrl = window.location.href
                    }
                    this.tryHandleAuthCallback()
                }
            })

        this.tokenLoaded = this.osmAuthService.loadToken()

        const urlId = this.route.snapshot.queryParamMap.get('id') // ex : id=node/5432 or id=way/123456 or relation/123
        if (
            urlId &&
            urlId.split('/').length >= 2 &&
            ['node', 'way', 'relation'].includes(urlId.split('/')[0])
        ) {
            this.idOsmObjectOnStart = urlId
            this.loadOsmDataOnStart = true
        }

        const queryZoom = this.route.snapshot.queryParamMap.get('zoom')
        const queryLoadData = this.route.snapshot.queryParamMap.get('loadData')
        if (queryZoom && parseFloat(queryZoom) > 10) {
            let zoom = parseFloat(queryZoom) || 18
            if (zoom <= 14 || zoom > 22) zoom = 18
            this.zoomOnStart = zoom
        }

        const urlCenter = this.route.snapshot.queryParamMap.get('center')
        if (urlCenter && urlCenter.split(',').length === 2) {
            const center = urlCenter.split(',')
            const long = parseFloat(center[0])
            const lat = parseFloat(center[1])

            if (
                Number.isFinite(long) &&
                Number.isFinite(lat) &&
                long >= -180 &&
                long <= 180 &&
                lat >= -90 &&
                lat <= 90
            ) {
                this.centerOnStart = [long, lat]
                this.loadOsmDataOnStart = queryLoadData === 'true'
            }
        }

        const urlAddFeature = this.route.snapshot.queryParamMap.get('add')
        if (urlAddFeature && !this.idOsmObjectOnStart) {
            if (!this.centerOnStart) {
                console.error('The add query parameter requires a map center.')
                return
            }
            if (!this.zoomOnStart) {
                this.zoomOnStart = 18
            }
            try {
                const addFeatureTag = JSON.parse(urlAddFeature)
                if (
                    typeof addFeatureTag !== 'object' ||
                    addFeatureTag === null ||
                    Array.isArray(addFeatureTag)
                )
                    throw new Error(
                        'The add query parameter must be an object.'
                    )
                if (
                    !Object.values(addFeatureTag).every(
                        (value) =>
                            typeof value === 'string' ||
                            typeof value === 'number'
                    )
                ) {
                    throw new Error(
                        'The add query parameter values must be strings or numbers.'
                    )
                }

                const _coords: LngLat = new LngLat(
                    this.centerOnStart[0],
                    this.centerOnStart[1]
                )
                this.addOsmObjectOnStart = {
                    coords: _coords,
                    tags: addFeatureTag as Record<string, string | number>,
                }
                this.loadOsmDataOnStart = true
            } catch (error) {
                console.error(error)
            }
        }

        this.swUpdate.versionUpdates
            .pipe(
                filter(
                    (evt): evt is VersionReadyEvent =>
                        evt.type === 'VERSION_READY'
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                this.newVersion.set(true)
            })
    }

    private tryHandleAuthCallback(): void {
        if (
            !this.initialDataLoaded ||
            this.authCallbackInProgress ||
            !this.pendingAuthCallbackUrl
        ) {
            return
        }

        const url = this.pendingAuthCallbackUrl
        this.pendingAuthCallbackUrl = null
        this.authCallbackInProgress = true

        this.osmAuthService
            .handleCallback(url)
            .pipe(
                switchMap(() => this.osmApi.getUserDetail$()),
                finalize(() => {
                    this.authCallbackInProgress = false
                    void this.router.navigate([], {
                        queryParams: {
                            code: null,
                            state: null,
                            error: null,
                            error_description: null,
                        },
                        queryParamsHandling: 'merge',
                        replaceUrl: true,
                    })
                    this.tryHandleAuthCallback()
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                error: (error) => {
                    console.error('Authentication failed.', error)
                    void this.presentToast(this.getErrorMessage(error))
                },
            })
    }

    private refreshStoredAuthentication(): void {
        void this.tokenLoaded.then((token) => {
            if (
                !token ||
                this.pendingAuthCallbackUrl ||
                this.authCallbackInProgress
            ) {
                return
            }

            this.osmApi
                .getUserDetail$()
                .pipe(take(1), takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    error: (error) => {
                        console.error(
                            'Unable to refresh the OpenStreetMap account.',
                            error
                        )
                    },
                })
        })
    }

    openMenu(): void {
        if (
            this.selectedFeature()?.type === 'Update' ||
            this.selectedFeature()?.type === 'Create'
        ) {
            this.objectSheet()?.requestExit()
            return
        }
        this.configService.freezeMapRenderer = true
        this.menuIsOpen.set(true)
    }

    closeMenu(): void {
        this.configService.freezeMapRenderer = false
        this.menuIsOpen.set(false)
    }

    onOverlayActivate(component: unknown): void {
        this.activeOverlayContent = component as RouteOverlayContent
        const configuredSize = this.route.firstChild?.snapshot.data[
            'overlaySize'
        ] as OverlaySize | undefined
        this.overlaySize.set(configuredSize ?? 'standard')
        this.overlayOpen.set(true)
        this.menuIsOpen.set(false)
        this.configService.freezeMapRenderer = true
    }

    onOverlayDeactivate(): void {
        this.activeOverlayContent = undefined
        this.overlayOpen.set(false)
        this.configService.freezeMapRenderer = false
        if (this.mapService.map) {
            requestAnimationFrame(() => {
                this.mapService.map.resize()
                const menuButton = document.querySelector<HTMLElement>(
                    '[data-testid="open-menu"]'
                )
                menuButton?.focus()
            })
        }
    }

    closeOverlay(): void {
        if (this.activeOverlayContent?.canCloseOverlay?.() === false) return
        void this.overlayNavigation.close()
    }

    @HostListener('document:keydown.escape')
    handleEscapeKey(): void {
        if (this.overlayOpen()) {
            this.closeOverlay()
        } else if (this.menuIsOpen()) {
            this.closeMenu()
        }
    }

    closeSelection(): void {
        this.selectedFeature.set(null)
        this.readBeforeEdit.set(null)
        this.sheetLevel.set('medium')
        void this.router.navigate([], {
            replaceUrl: true,
            relativeTo: this.route,
            queryParams: { id: null },
            queryParamsHandling: 'merge',
        })
    }

    openSelectedDetails(): void {
        if (this.selectedFeature()) this.sheetLevel.set('expanded')
    }

    editSelectedFeature(): void {
        const selection = this.selectedFeature()
        if (selection) {
            this.readBeforeEdit.set(selection)
            this.selectedFeature.set({ ...selection, type: 'Update' })
            this.sheetLevel.set('expanded')
        }
    }

    startAddingObject(): void {
        this.closeSelection()
        this.mapService.positionateMarker()
    }

    handleSheetSession(data: ModalDismissData): void {
        const selection = this.selectedFeature()
        if (!selection) return

        if (data.type === 'Move' && data.geojson) {
            this.selectedFeature.set({
                ...selection,
                type: data.mode ?? selection.type,
                geojson: data.geojson,
                newPosition: false,
            })
            this.mapService.moveElement(data)
            return
        }

        if (data.deleted) {
            this.closeSelection()
        } else if (data.geojson) {
            this.readBeforeEdit.set(null)
            this.selectedFeature.set({
                type: 'Read',
                geojson: data.geojson,
                origineData: data.origineData ?? 'data_changed',
            })
            this.sheetLevel.set('medium')
        } else if (data.type === 'Cancel') {
            const previousRead = this.readBeforeEdit()
            this.selectedFeature.set(
                previousRead ?? { ...selection, type: 'Read' }
            )
            this.readBeforeEdit.set(null)
            this.sheetLevel.set('medium')
        }

        if (data.redraw) {
            timer(50)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                    this.mapService.redrawMarkers(this.dataService.getGeojson())
                    this.mapService.redrawChangedMarkers(
                        this.dataService.getGeojsonChanged()
                    )
                })
        }
        this.mapService.setCenterInUrl()
    }

    presentConfirm(): void {
        const data: ConfirmDialogData = {
            title: this.translate.instant('MAIN.EXIT_CONFIRM_HEADER'),
            message: this.translate.instant('MAIN.EXIT_CONFIRM_MESSAGE'),
            cancelLabel: this.translate.instant('SHARED.NO'),
            confirmLabel: this.translate.instant('SHARED.YES'),
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
                    void CapacitorApp.exitApp()
                }
            })
    }

    loadData(): void {
        this.loadData$()
            .pipe(take(1), takeUntilDestroyed(this.destroyRef))
            .subscribe()
    }

    loadData$(): Observable<void> {
        this.mapService.setIsProcessing(true)
        this.alertService.displayToolTipRefreshData = false

        const bbox: BBox = this.mapService.getBbox()
        return this.osmApi
            .getDataFromBbox(bbox, this.configService.getLimitFeatures())
            .pipe(
                switchMap((newDataJson) => {
                    if (!this.isMapDataResult(newDataJson)) {
                        throw new Error('The map worker returned invalid data.')
                    }
                    return from(
                        this.dataService.applyDownload({
                            geojson: newDataJson.geojson,
                            geojsonBbox: newDataJson.geojsonBbox,
                        })
                    ).pipe(
                        map(() => {
                            this.mapService.redrawBbox(newDataJson.geojsonBbox)
                            this.mapService.redrawMarkers(newDataJson.geojson)
                            this.mapService.setIsProcessing(false)
                        })
                    )
                }),

                catchError((error: unknown) => {
                    this.mapService.setIsProcessing(false)
                    console.error(error)
                    void this.presentToast(this.getErrorMessage(error))
                    return EMPTY
                })
            )
    }

    presentToast(message: string): void {
        this.snackBar.open(message, this.translate.instant('SHARED.CLOSE'), {
            duration: 4000,
            verticalPosition: 'top',
        })
    }

    ngAfterViewInit(): void {
        const mapElement = this.mapElement()
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === mapElement.nativeElement) {
                    if (this.mapService.map) this.mapService.map.resize()
                }
            }
        })

        this.resizeObserver.observe(mapElement.nativeElement)

        this.initService
            .initLoadData$(
                this.centerOnStart,
                this.zoomOnStart,
                this.idOsmObjectOnStart
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(({ config }) => {
                this.initialDataLoaded = true
                this.tryHandleAuthCallback()
                this.refreshStoredAuthentication()
                this.locationService.enableGeolocation()
                this.mapService.initMap(config)
            })

        this.mapService.mapLoaded$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                if (this.addOsmObjectOnStart) {
                    this.mapService.openModalOsm(
                        this.addOsmObjectOnStart.coords,
                        this.addOsmObjectOnStart.tags
                    )
                }

                if (this.loadOsmDataOnStart) {
                    this.loadData$()
                        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
                        .subscribe({
                            next: () => this.openRequestedObject(),
                        })
                }
                timer(2000)
                    .pipe(take(1), takeUntilDestroyed(this.destroyRef))
                    .subscribe(() => {
                        const featureCount =
                            this.dataService.getGeojson().features.length
                        if (featureCount > 0) {
                            this.alertService.showAlert(
                                `${featureCount} ${this.translate.instant(
                                    'MAIN.START_SNACK_ITEMS_IN_MEMORY'
                                )}`
                            )
                        } else {
                            this.alertService.requestRefreshTooltip()
                        }
                    })
            })

        this.alertService.displayRefreshTooltip$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                const snackBarRef = this.snackBar.open(
                    this.translate.instant('MAIN.LOAD_BBOX'),
                    'OK',
                    { duration: 4000 }
                )
                snackBarRef
                    .onAction()
                    .pipe(take(1), takeUntilDestroyed(this.destroyRef))
                    .subscribe(() => {
                        if (this.mapService.map.getZoom() > 16) {
                            this.loadData$()
                                .pipe(
                                    take(1),
                                    takeUntilDestroyed(this.destroyRef)
                                )
                                .subscribe()
                        }
                    })
            })

        this.initializeHistory()
        window.addEventListener('popstate', this.handlePopState)
        void CapacitorApp.addListener('backButton', () => {
            if (this.overlayOpen()) {
                this.closeOverlay()
            } else if (this.menuIsOpen()) {
                this.closeMenu()
            } else if (this.selectedFeature()) {
                this.objectSheet()?.requestExit()
            } else {
                this.presentConfirm()
            }
        }).then((listener) => {
            this.backButtonListener = listener
        })
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect()
        void this.backButtonListener?.remove()
        window.removeEventListener('popstate', this.handlePopState)
        this.mapService.destroyMap()
    }

    private openRequestedObject(): void {
        if (!this.idOsmObjectOnStart) {
            return
        }

        let origineData: FeatureIdSource = 'data_changed'
        let feature = this.dataService.getFeatureById(
            this.idOsmObjectOnStart,
            origineData
        )
        if (!feature) {
            origineData = 'data'
            feature = this.dataService.getFeatureById(
                this.idOsmObjectOnStart,
                origineData
            )
        }

        if (!feature) {
            void this.presentToast('Object not found in downloaded data.')
            return
        }
        this.mapService.showModal({
            type: 'Read',
            geojson: feature,
            origineData,
        })
    }

    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error)
    }

    private isMapDataResult(value: unknown): value is MapDataResult {
        if (typeof value !== 'object' || value === null) {
            return false
        }
        const candidate = value as Partial<MapDataResult>
        return (
            this.isFeatureCollection(candidate.geojson) &&
            this.isFeatureCollection(candidate.geojsonBbox)
        )
    }

    private isFeatureCollection(
        value: unknown
    ): value is OsmGoFeatureCollection {
        if (typeof value !== 'object' || value === null) {
            return false
        }
        const candidate = value as Partial<OsmGoFeatureCollection>
        return (
            candidate.type === 'FeatureCollection' &&
            Array.isArray(candidate.features)
        )
    }
}
