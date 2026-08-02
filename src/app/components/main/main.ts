import {
    type AfterViewInit,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    type OnDestroy,
    type OnInit,
    signal,
    viewChild,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router'
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker'
import { OsmAuthService } from '@app/services/osm-auth.service'
import { App as CapacitorApp } from '@capacitor/app'
import { DialogMultiFeaturesComponent } from '@components/dialog-multi-features/dialog-multi-features.component'
import { MenuPage } from '@components/menu/menu'
import { ModalDismissData, ModalsContentPage } from '@components/modal/modal'
import {
    AlertController,
    IonBadge,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    IonSpinner,
    ModalController,
    NavController,
    ToastController,
} from '@ionic/angular/standalone'
import { TranslateService } from '@ngx-translate/core'
import type { FeatureIdSource, OsmGoFeatureCollection } from '@osmgo/type'
import { AlertService } from '@services/alert.service'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { InitService } from '@services/init.service'
import { LocationService } from '@services/location.service'
import { MapService } from '@services/map.service'
import { OsmApiService } from '@services/osmApi.service'
import { TagsService } from '@services/tags.service'
import type { BBox } from 'geojson'
import { LngLat } from 'maplibre-gl'
import { EMPTY, type Observable, take, timer } from 'rxjs'
import { catchError, filter, map, switchMap } from 'rxjs/operators'

interface MapDataResult {
    geojson: OsmGoFeatureCollection
    geojsonBbox: OsmGoFeatureCollection
}

@Component({
    templateUrl: './main.html',
    selector: 'main',
    styleUrls: ['./main.scss'],
    imports: [
        IonBadge,
        IonContent,
        IonFab,
        IonFabButton,
        IonIcon,
        IonSpinner,
        MenuPage,
    ],
})
export class MainPage implements AfterViewInit, OnDestroy, OnInit {
    readonly navCtrl = inject(NavController)
    readonly modalCtrl = inject(ModalController)
    readonly toastCtrl = inject(ToastController)
    readonly osmApi = inject(OsmApiService)
    readonly tagsService = inject(TagsService)
    readonly mapService = inject(MapService)
    readonly dataService = inject(DataService)
    readonly locationService = inject(LocationService)
    readonly alertService = inject(AlertService)
    readonly configService = inject(ConfigService)
    private readonly alertCtrl = inject(AlertController)
    private readonly router = inject(Router)
    readonly translate = inject(TranslateService)
    private readonly swUpdate = inject(SwUpdate)
    readonly initService = inject(InitService)
    private readonly osmAuthService = inject(OsmAuthService)
    private readonly route = inject(ActivatedRoute)
    private readonly destroyRef = inject(DestroyRef)

    modalIsOpen = false
    readonly menuIsOpen = signal(false)
    readonly newVersion = signal(false)
    centerOnStart?: number[]
    zoomOnStart?: number
    loadOsmDataOnStart = false
    idOsmObjectOnStart?: string
    addOsmObjectOnStart?: {
        coords: LngLat
        tags: Record<string, string | number>
    }
    private resizeObserver?: ResizeObserver
    private initializeHistory(): void {
        window.history.pushState({ noBackExitsApp: true }, '')
    }
    private readonly handlePopState = (): void => {
        window.history.pushState({ noBackExitsApp: true }, '')
        if (this.menuIsOpen()) {
            this.closeMenu()
        } else if (this.modalIsOpen) {
            void this.modalCtrl.dismiss()
        }
    }

    readonly mapElement = viewChild.required<ElementRef<HTMLElement>>('map')

    // authType = this.platform.platforms().includes('hybrid') ? 'basic' : 'oauth'

    constructor() {
        this.router.events
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((event) => {
                if (event instanceof NavigationEnd) {
                    if (event.urlAfterRedirects === '/main') {
                        this.configService.freezeMapRenderer = false
                        if (this.mapService.map) {
                            timer(300)
                                .pipe(takeUntilDestroyed(this.destroyRef))
                                .subscribe(() => {
                                    this.mapService.map.resize()
                                })
                        }
                    } else {
                        this.configService.freezeMapRenderer = true
                    }
                }
            })

        this.mapService.featureChoiceRequested$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(async (features) => {
                const modal = await this.modalCtrl.create({
                    component: DialogMultiFeaturesComponent,
                    cssClass: 'dialog-multi-features',
                    componentProps: {
                        features: features,
                        jsonSprites: this.tagsService.jsonSprites(),
                    },
                })
                await modal.present()

                modal.onDidDismiss().then((d) => {
                    if (d && d.data) {
                        this.mapService.selectFeature(d.data)
                    }
                })
            })

        this.mapService.showModal$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(async (_data) => {
                this.configService.freezeMapRenderer = true
                const newPosition = _data.newPosition ?? false

                const modal = await this.modalCtrl.create({
                    component: ModalsContentPage,
                    componentProps: {
                        type: _data.type,
                        data: _data.geojson,
                        newPosition: newPosition,
                        origineData: _data.origineData,
                        openPrimaryTagModalOnStart:
                            _data.openPrimaryTagModalOnStart,
                    },
                })
                await modal.present()
                this.modalIsOpen = true

                modal.onDidDismiss<ModalDismissData>().then((d) => {
                    this.modalIsOpen = false
                    const data = d.data
                    this.configService.freezeMapRenderer = false
                    if (data) {
                        if (data.type === 'Move') {
                            this.mapService.moveElement(data)
                        }
                        if (data.redraw) {
                            timer(50)
                                .pipe(takeUntilDestroyed(this.destroyRef))
                                .subscribe(() => {
                                    this.mapService.redrawMarkers(
                                        this.dataService.getGeojson()
                                    )
                                    this.mapService.redrawChangedMarkers(
                                        this.dataService.getGeojsonChanged()
                                    )
                                })
                        }
                    }
                    this.mapService.setCenterInUrl()
                })
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
                    this.handleAuthCallback(window.location.href)
                    this.router.navigate([], {
                        queryParams: {
                            code: null,
                            state: null,
                            error: null,
                            error_description: null,
                        },
                        queryParamsHandling: 'merge',
                    })
                }
            })

        this.osmAuthService.loadToken()

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

    private handleAuthCallback(url: string): void {
        this.osmAuthService
            .handleCallback(url)
            .pipe(
                switchMap(() => this.osmApi.getUserDetail$()),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                error: (error) => {
                    console.error('Authentication failed.', error)
                },
            })
    }

    openMenu(): void {
        this.configService.freezeMapRenderer = true
        this.menuIsOpen.set(true)
    }

    closeMenu(): void {
        this.configService.freezeMapRenderer = false
        this.menuIsOpen.set(false)
    }

    async presentConfirm(): Promise<void> {
        const alert = await this.alertCtrl.create({
            header: this.translate.instant('MAIN.EXIT_CONFIRM_HEADER'),
            message: this.translate.instant('MAIN.EXIT_CONFIRM_MESSAGE'),
            buttons: [
                {
                    text: this.translate.instant('SHARED.NO'),
                    role: 'cancel',
                    handler: () => {},
                },
                {
                    text: this.translate.instant('SHARED.YES'),
                    handler: () => {
                        void CapacitorApp.exitApp()
                    },
                },
            ],
        })
        await alert.present()
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
                map((newDataJson) => {
                    if (!this.isMapDataResult(newDataJson)) {
                        throw new Error('The map worker returned invalid data.')
                    }
                    this.dataService.setGeojsonBbox(newDataJson.geojsonBbox)
                    this.mapService.redrawBbox(newDataJson.geojsonBbox)
                    this.dataService.setGeojson(newDataJson.geojson)
                    this.mapService.redrawMarkers(newDataJson.geojson)
                    this.mapService.setIsProcessing(false)
                }),

                catchError((error: unknown) => {
                    this.mapService.setIsProcessing(false)
                    console.error(error)
                    void this.presentToast(this.getErrorMessage(error))
                    return EMPTY
                })
            )
    }

    async presentToast(message: string): Promise<void> {
        const toast = await this.toastCtrl.create({
            message: message,
            duration: 4000,
            position: 'top',
            buttons: [
                {
                    text: 'X',
                    role: 'cancel',
                    handler: () => {},
                },
            ],
        })
        await toast.present()
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
            .subscribe(async () => {
                const toast = await this.toastCtrl.create({
                    message: this.translate.instant('MAIN.LOAD_BBOX'),
                    duration: 4000,
                    position: 'bottom',
                    buttons: [
                        {
                            text: 'Ok',
                            role: 'cancel',
                            handler: () => {
                                if (this.mapService.map.getZoom() > 16) {
                                    this.loadData$()
                                        .pipe(
                                            take(1),
                                            takeUntilDestroyed(this.destroyRef)
                                        )
                                        .subscribe()
                                }
                            },
                        },
                    ],
                })
                await toast.present()
            })

        this.initializeHistory()
        window.addEventListener('popstate', this.handlePopState)
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect()
        window.removeEventListener('popstate', this.handlePopState)
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
