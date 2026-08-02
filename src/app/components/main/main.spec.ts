import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'
import { SwUpdate } from '@angular/service-worker'
import {
    AlertController,
    LoadingController,
    MenuController,
    ModalController,
    NavController,
    ToastController,
} from '@ionic/angular/standalone'
import { TranslateService } from '@ngx-translate/core'
import { AlertService } from '@services/alert.service'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { InitService } from '@services/init.service'
import { LocationService } from '@services/location.service'
import { MapService } from '@services/map.service'
import { OsmAuthService } from '@services/osm-auth.service'
import { OsmApiService } from '@services/osmApi.service'
import { TagsService } from '@services/tags.service'
import { Subject, throwError } from 'rxjs'
import type { Mock } from 'vitest'

import { ModalsContentPage } from '../modal/modal'
import { MainPage } from './main'

interface MainPageDependencies {
    modalCtrl?: Record<string, unknown>
    osmApi?: Record<string, unknown>
    mapService?: Record<string, unknown>
    dataService?: Record<string, unknown>
    alertService?: Record<string, unknown>
    configService?: Record<string, unknown>
}

interface MainPageMapServiceStub extends Record<string, unknown> {
    eventShowDialogMultiFeatures: Subject<unknown>
    eventShowModal: Subject<unknown>
    setCenterInUrl: Mock
}

const createPage = ({
    modalCtrl = {},
    osmApi = {},
    mapService = {},
    dataService = {},
    alertService = {},
    configService = {},
}: MainPageDependencies = {}) => {
    const resolvedMapService: MainPageMapServiceStub = {
        eventShowDialogMultiFeatures: new Subject(),
        eventShowModal: new Subject(),
        setCenterInUrl: vi.fn(),
        ...mapService,
    } as MainPageMapServiceStub
    const resolvedAlertService = {
        eventNewAlert: new Subject(),
        ...alertService,
    }
    const resolvedConfigService = {
        freezeMapRenderer: false,
        ...configService,
    }
    const router = { events: new Subject() }
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
        providers: [
            { provide: NavController, useValue: {} },
            { provide: ModalController, useValue: modalCtrl },
            { provide: ToastController, useValue: {} },
            { provide: MenuController, useValue: {} },
            { provide: OsmApiService, useValue: osmApi },
            { provide: TagsService, useValue: {} },
            { provide: MapService, useValue: resolvedMapService },
            { provide: DataService, useValue: dataService },
            { provide: LocationService, useValue: {} },
            { provide: AlertService, useValue: resolvedAlertService },
            { provide: ConfigService, useValue: resolvedConfigService },
            { provide: AlertController, useValue: {} },
            { provide: Router, useValue: router },
            { provide: TranslateService, useValue: {} },
            { provide: LoadingController, useValue: {} },
            { provide: SwUpdate, useValue: {} },
            { provide: InitService, useValue: {} },
            { provide: OsmAuthService, useValue: {} },
            { provide: ActivatedRoute, useValue: {} },
        ],
    })
    const page = TestBed.runInInjectionContext(() => new MainPage())

    return {
        page,
        mapService: resolvedMapService,
        configService: resolvedConfigService,
    }
}

describe('MainPage', () => {
    it('opens and closes the feature modal with its input data', async () => {
        const eventShowModal = new Subject<{
            type: string
            geojson: { id: string }
            origineData: string
        }>()
        let dismissModal: (result: { data?: unknown }) => void = () => {
            throw new Error('The modal dismissal is not ready.')
        }
        const dismissed = new Promise<{ data?: unknown }>((resolve) => {
            dismissModal = resolve
        })
        const modal = {
            present: vi.fn().mockResolvedValue(undefined),
            onDidDismiss: vi.fn().mockReturnValue(dismissed),
        }
        const modalCtrl = {
            create: vi.fn().mockResolvedValue(modal),
        }
        const feature = { id: 'node/1' }
        const { page, configService, mapService } = createPage({
            modalCtrl,
            mapService: {
                eventShowModal,
                setCenterInUrl: vi.fn(),
            },
        })

        eventShowModal.next({
            type: 'Read',
            geojson: feature,
            origineData: 'data',
        })

        await vi.waitFor(() => expect(modal.present).toHaveBeenCalledOnce())
        expect(modalCtrl.create).toHaveBeenCalledWith({
            component: ModalsContentPage,
            componentProps: {
                type: 'Read',
                data: feature,
                newPosition: false,
                origineData: 'data',
                openPrimaryTagModalOnStart: undefined,
            },
        })
        expect(page.modalIsOpen).toBe(true)
        expect(configService.freezeMapRenderer).toBe(true)

        dismissModal({})

        await vi.waitFor(() => expect(page.modalIsOpen).toBe(false))
        expect(configService.freezeMapRenderer).toBe(false)
        expect(mapService.setCenterInUrl).toHaveBeenCalledOnce()
    })

    it('keeps existing data and clears processing after a download failure', () => {
        const mapService = {
            eventNewBboxPolygon: {
                emit: vi.fn().mockName('EventEmitter.emit'),
            },
            eventMarkerReDraw: {
                emit: vi.fn().mockName('EventEmitter.emit'),
            },
            getBbox: () => [1, 2, 3, 4],
            setIsProcessing: vi.fn().mockName('setIsProcessing'),
        }
        const downloadError = new Error('Worker conversion failed')
        const osmApi = {
            getDataFromBbox: vi
                .fn()
                .mockName('getDataFromBbox')
                .mockReturnValue(throwError(() => downloadError)),
        }
        const dataService = {
            setGeojsonBbox: vi.fn().mockName('DataService.setGeojsonBbox'),
            setGeojson: vi.fn().mockName('DataService.setGeojson'),
        }
        const alertService = {
            eventNewAlert: new Subject(),
            displayToolTipRefreshData: true,
        }
        const configService = {
            getLimitFeatures: () => 100,
            freezeMapRenderer: false,
        }
        const { page } = createPage({
            osmApi,
            mapService,
            dataService,
            alertService,
            configService,
        })
        vi.spyOn(console, 'error').mockReturnValue(undefined)
        vi.spyOn(page, 'presentToast').mockResolvedValue()

        page.loadData$().subscribe()

        expect(vi.mocked(mapService.setIsProcessing).mock.calls).toEqual([
            [true],
            [false],
        ])
        expect(dataService.setGeojsonBbox).not.toHaveBeenCalled()
        expect(dataService.setGeojson).not.toHaveBeenCalled()
        expect(page.presentToast).toHaveBeenCalledTimes(1)
        expect(vi.mocked(page.presentToast as Mock).mock.lastCall[0]).toBe(
            downloadError
        )
    })

    it('forwards marker movement after the modal closes', async () => {
        const eventShowModal = new Subject<any>()
        const eventMoveElement = {
            emit: vi.fn().mockName('eventMoveElement.emit'),
        }
        const movedFeature = {
            type: 'Move',
            geojson: { id: 'node/1' },
            mode: 'Update',
        }
        const modal = {
            present: vi.fn().mockResolvedValue(undefined),
            onDidDismiss: vi.fn().mockResolvedValue({ data: movedFeature }),
        }
        const { mapService } = createPage({
            modalCtrl: {
                create: vi.fn().mockResolvedValue(modal),
            },
            mapService: {
                eventShowModal,
                eventMoveElement,
                setCenterInUrl: vi.fn(),
            },
        })

        eventShowModal.next({
            type: 'Read',
            geojson: movedFeature.geojson,
            origineData: 'data',
        })

        await vi.waitFor(() => {
            expect(eventMoveElement.emit).toHaveBeenCalledWith(movedFeature)
        })
        expect(mapService.setCenterInUrl).toHaveBeenCalledOnce()
    })
})
