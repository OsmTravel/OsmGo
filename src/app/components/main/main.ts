declare const ResizeObserver: any

import {
    Component,
    NgZone,
    AfterViewInit,
    ViewChild,
    ElementRef,
} from '@angular/core'
import {
    NavController,
    MenuController,
    ModalController,
    ToastController,
    Platform,
    AlertController,
    LoadingController,
} from '@ionic/angular'

import { OsmApiService } from '@services/osmApi.service'
import { TagsService } from '@services/tags.service'
import { MapService } from '@services/map.service'
import { DataService } from '@services/data.service'
import { LocationService } from '@services/location.service'
import { AlertService } from '@services/alert.service'
import { ConfigService } from '@services/config.service'
import { ModalDismissData, ModalsContentPage } from '@components/modal/modal'

import { timer, forkJoin, take, of, Observable, pipe } from 'rxjs'
import { catchError, filter, map } from 'rxjs/operators'
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'

import { SwUpdate, VersionReadyEvent } from '@angular/service-worker'

import { DialogMultiFeaturesComponent } from '@components/dialog-multi-features/dialog-multi-features.component'

import { InitService } from '@services/init.service'

import { App as CapacitorApp } from '@capacitor/app'
import { BBox } from '@turf/turf'
import { FeatureIdSource } from '@osmgo/type'
import { LngLat } from 'maplibre-gl'
import { OsmAuthService } from '@app/services/osm-auth.service'

@Component({
    templateUrl: './main.html',
    selector: 'main',
    styleUrls: ['./main.scss'],
})
export class MainPage implements AfterViewInit {
    modalIsOpen: boolean = false
    menuIsOpen: boolean = false
    newVersion: boolean = false
    loading: boolean = true
    centerOnStart?: number[]
    zoomOnStart?: number
    loadOsmDataOnStart: boolean = false
    idOsmObjectOnStart?: string
    addOsmObjectOnStart?: { coords: LngLat; tags: any }

    @ViewChild('map', { static: false }) mapElement: ElementRef

    // authType = this.platform.platforms().includes('hybrid') ? 'basic' : 'oauth'

    constructor(
        public navCtrl: NavController,
        public modalCtrl: ModalController,
        public toastCtrl: ToastController,
        public menuCtrl: MenuController,
        public osmApi: OsmApiService,
        public tagsService: TagsService,
        public mapService: MapService,
        public dataService: DataService,
        public locationService: LocationService,
        public alertService: AlertService,
        public configService: ConfigService,

        private alertCtrl: AlertController,
        private _ngZone: NgZone,
        private router: Router,
        public translate: TranslateService,
        public loadingController: LoadingController,
        private swUpdate: SwUpdate,
        public initService: InitService,
        private osmAuthService: OsmAuthService,
        private route: ActivatedRoute
    ) {
        this.router.events.subscribe((e) => {
            if (e instanceof NavigationEnd) {
                if (e.urlAfterRedirects === '/main') {
                    this.configService.freezeMapRenderer = false
                    // la carte ne detect pas toujours le changement de taille du DOM...
                    if (this.mapService.map) {
                        timer(300).subscribe((t) => {
                            this.mapService.map.resize()
                        })
                    }
                } else {
                    this.configService.freezeMapRenderer = true
                }
            }
        })

        mapService.eventShowDialogMultiFeatures.subscribe(async (features) => {
            const modal = await this.modalCtrl.create({
                component: DialogMultiFeaturesComponent,
                cssClass: 'dialog-multi-features',
                componentProps: {
                    features: features,
                    jsonSprites: this.tagsService.jsonSprites,
                },
            })
            await modal.present()

            modal.onDidDismiss().then((d) => {
                if (d && d.data) {
                    const feature = d.data
                    this.mapService.selectFeature(feature) // bof
                }
            })
        })

        mapService.eventShowModal.subscribe(async (_data) => {
            this.configService.freezeMapRenderer = true
            const newPosition = _data.newPosition ? _data.newPosition : false

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
                        this.mapService.eventMoveElement.emit(data)
                    }
                    if (data.redraw) {
                        timer(50).subscribe((t) => {
                            this.mapService.eventMarkerReDraw.emit(
                                this.dataService.getGeojson()
                            )
                            this.mapService.eventMarkerChangedReDraw.emit(
                                this.dataService.getGeojsonChanged()
                            )
                        })
                    }
                }
                this.mapService.setCenterInUrl()
            })
        })

        this.alertService.eventNewAlert.subscribe((alert) => {
            this.presentToast(alert)
        })
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe((params) => {
            if (params['code']) {
                this.handleAuthCallback(params['code'])
                //remove 'code' from url to prevent handling it again
                this.router.navigate([], {
                    queryParams: {
                        code: null,
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
        if (urlCenter && urlCenter.split(',').length == 2) {
            const center = urlCenter.split(',')
            const long = parseFloat(center[0])
            const lat = parseFloat(center[1])

            if (
                long &&
                lat &&
                long > -180 &&
                long < 180 &&
                lat > -90 &&
                lat < 90
            ) {
                this.centerOnStart = [long, lat]
                this.loadOsmDataOnStart =
                    queryLoadData === 'true' ? true : false
            }
        }

        // add={"shop": "bakery", "name": "Boulangerie"}
        const urlAddFeature = this.route.snapshot.queryParamMap.get('add')
        if (urlAddFeature && !this.idOsmObjectOnStart) {
            if (!this.centerOnStart) {
                return console.error('addFeatureTag need center')
            }
            if (!this.zoomOnStart) {
                this.zoomOnStart = 18
            }
            try {
                const addFeatureTag = JSON.parse(urlAddFeature)
                if (typeof addFeatureTag !== 'object')
                    throw new Error('addFeatureTag is not an object')

                const _coords: LngLat = new LngLat(
                    this.centerOnStart[0],
                    this.centerOnStart[1]
                )
                this.addOsmObjectOnStart = {
                    coords: _coords,
                    tags: addFeatureTag,
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
                map((evt) => ({
                    type: 'UPDATE_AVAILABLE',
                    current: evt.currentVersion,
                    available: evt.latestVersion,
                }))
            )
            .subscribe((event) => {
                this.newVersion = true
            })
    }

    private handleAuthCallback(code: string) {
        console.log('handleAuthCallback', code)

        this.osmAuthService.exchangeCodeForToken(code).subscribe(
            (response) => {
                console.log('Authentification réussie', response)
                const token = response.access_token

                this.osmApi.getUserDetail$().subscribe({
                    next: (user_info: any) => {
                        console.log(user_info)
                        this.configService.setUserInfo(user_info)
                        this.osmAuthService.setToken(token)
                    },
                    error: (error) => {
                        console.error(
                            "Erreur lors de la récupération des détails de l'utilisateur:",
                            error
                        )
                    },
                })

                // Gérer l'authentification réussie ici
            },
            (error) => {
                console.error("Erreur d'authentification", error)
                // Gérer l'erreur d'authentification ici
            }
        )
    }

    openMenu(): void {
        this.configService.freezeMapRenderer = true
        this.menuIsOpen = true
        // history.pushState({menu:'open'}, 'menu')
        // TODO history.pushState({msg:'openned side bar', menu:'open'}, 'menu')
    }

    closeMenu(): void {
        this.configService.freezeMapRenderer = false
        this.menuIsOpen = false
    }

    presentConfirm(): void {
        this.alertCtrl
            .create({
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
                            window.navigator['app'].exitApp()
                        },
                    },
                ],
            })
            .then((alert) => {
                alert.present()
            })
    }

    loadData(): void {
        this.loadData$().pipe(take(1)).subscribe()
    }

    loadData$(): Observable<any> {
        this.mapService.setIsProcessing(true)
        // L'utilisateur charge les données, on supprime donc le tooltip
        this._ngZone.run(() => {
            this.alertService.displayToolTipRefreshData = false
        })

        // return a promise

        const bbox: BBox = this.mapService.getBbox()
        return this.osmApi
            .getDataFromBbox(bbox, this.configService.getLimitFeatures())
            .pipe(
                map((newDataJson) => {
                    this.dataService.setGeojsonBbox(newDataJson['geojsonBbox'])
                    this.mapService.eventNewBboxPolygon.emit(
                        newDataJson['geojsonBbox']
                    )
                    this.dataService.setGeojson(newDataJson['geojson'])
                    this.mapService.eventMarkerReDraw.emit(
                        newDataJson['geojson']
                    )
                    this.mapService.setIsProcessing(false)
                }),

                // catch error and display a toast
                catchError((err) => {
                    this.mapService.setIsProcessing(false)
                    console.error(err)
                    this.presentToast(err)
                    return of(err)
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
        toast.present()
    }

    ngAfterViewInit(): void {
        if (this.mapElement && this.mapElement.nativeElement) {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.target === this.mapElement.nativeElement) {
                        if (this.mapService.map) this.mapService.map.resize()
                    }
                }
            })

            observer.observe(this.mapElement.nativeElement)
        }

        //http://localhost:4200/#/main?id=node/11108970847

        this.initService
            .initLoadData$(
                this.centerOnStart,
                this.zoomOnStart,
                this.idOsmObjectOnStart
            )
            .subscribe(
                ({
                    config,
                    userInfo,
                    savedFields,
                    presets,
                    tags,
                    geojson,
                    geojsonChanged,
                    geojsonBbox,
                }) => {
                    this.locationService.enableGeolocation()

                    this.mapService.initMap(config)
                }
            )

        this.mapService.eventMapIsLoaded.subscribe(() => {
            if (this.addOsmObjectOnStart) {
                this.mapService.openModalOsm(
                    this.addOsmObjectOnStart.coords,
                    this.addOsmObjectOnStart.tags
                )
            }

            this.loading = false
            if (this.loadOsmDataOnStart) {
                this.loadData$()
                    .pipe(take(1))
                    .subscribe({
                        next: () => {
                            if (this.idOsmObjectOnStart) {
                                // find feature from dataChanged if exist, else from data
                                let origineData: FeatureIdSource =
                                    'data_changed'
                                let feature = this.dataService.getFeatureById(
                                    this.idOsmObjectOnStart,
                                    'data_changed'
                                )
                                if (!feature) {
                                    feature = this.dataService.getFeatureById(
                                        this.idOsmObjectOnStart,
                                        'data'
                                    )
                                    origineData = 'data'
                                }

                                if (!feature) {
                                    // this.translate.instant(
                                    const errorMessage =
                                        'Objetct not found in data' // TODO translate
                                    this.presentToast(errorMessage)
                                    return
                                }
                                // this.mapService.selectFeature(feature)
                                this.mapService.eventShowModal.emit({
                                    type: 'Read',
                                    geojson: feature,
                                    origineData: origineData,
                                })
                            }
                        },
                    })
            }
            timer(2000)
                .pipe(take(1))
                .subscribe(() => {
                    const nbData = this.dataService.getGeojson().features.length
                    if (nbData > 0) {
                        // Il y a des données stockées en mémoires...
                        this.alertService.eventNewAlert.emit(
                            nbData +
                                ' ' +
                                this.translate.instant(
                                    'MAIN.START_SNACK_ITEMS_IN_MEMORY'
                                )
                        )
                    } else {
                        // L'utilisateur n'a pas de données stockées, on le guide pour en télécharger... Tooltip
                        this.alertService.eventDisplayToolTipRefreshData.emit()
                    }
                })
        })

        this.alertService.eventDisplayToolTipRefreshData.subscribe(async () => {
            const toast = await this.toastCtrl.create({
                message: this.translate.instant('MAIN.LOAD_BBOX'),
                duration: 4000,
                position: 'bottom',
                buttons: [
                    {
                        text: 'Ok',
                        role: 'cancel',
                        handler: () => {
                            if (
                                this.mapService.map &&
                                this.mapService.map.getZoom() > 16
                            ) {
                                this.loadData$().pipe(take(1)).subscribe()
                            }
                        },
                    },
                ],
            })
            toast.present()
        })

        // Initialize bahaviors when pressing backButton on device
        /*TODO
    CapacitorApp.addListener('backButton', ({canGoBack}) => {
      if(canGoBack) {
        window.history.back();
      } else {
        //TODO CapacitorApp.exitApp();
      }
    });*/

        window.addEventListener('load', (e) => {
            window.history.pushState({ noBackExitsApp: true }, '')
            //TODO window.history.pushState({ msg: 'a state for load' }, 'load')
        })

        window.addEventListener('popstate', (e) => {
            // We push a new state to "replace" the one that have been pop
            // It is uggly, but it prevent the app to exit
            // We need to only add state when we are really opening modal or other screens
            // TODO: add state only when popup or action are in progress
            // TODO: add a popup "Are you sure to quit OsmGo!"
            // window.history.pushState({ msg: 'here a new state' }, 'after popstate')
            if (this.menuIsOpen) {
                window.history.pushState({ noBackExitsApp: true }, '')
                this.closeMenu()
            } else if (this.modalIsOpen) {
                window.history.pushState({ noBackExitsApp: true }, '')
                this.modalCtrl.dismiss()
            } else {
                window.history.pushState({ noBackExitsApp: true }, '')
            }
        })
    }
}
