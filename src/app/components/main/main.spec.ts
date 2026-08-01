import { Subject, throwError } from 'rxjs'
import type { Mock } from 'vitest'

import { MainPage } from './main'

const createPage = ({
    modalCtrl = {},
    osmApi = {},
    mapService = {},
    dataService = {},
    alertService = {},
    configService = {},
    changeDetectorRef = { detectChanges: vi.fn() },
}: any = {}) => {
    const resolvedMapService = {
        eventShowDialogMultiFeatures: new Subject(),
        eventShowModal: new Subject(),
        ...mapService,
    }
    const resolvedAlertService = {
        eventNewAlert: new Subject(),
        ...alertService,
    }
    const resolvedConfigService = {
        freezeMapRenderer: false,
        ...configService,
    }
    const router = { events: new Subject() }
    const ngZone = { run: (callback) => callback() }
    const page = new MainPage(
        {} as any,
        modalCtrl as any,
        {} as any,
        {} as any,
        osmApi as any,
        {} as any,
        resolvedMapService as any,
        dataService as any,
        {} as any,
        resolvedAlertService as any,
        resolvedConfigService as any,
        {} as any,
        ngZone as any,
        router as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        changeDetectorRef as any
    )

    return { page, mapService: resolvedMapService }
}

describe('MainPage', () => {
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

    it('refreshes the map controls when marker movement starts', async () => {
        const eventShowModal = new Subject<any>()
        const eventMoveElement = {
            emit: vi.fn().mockName('eventMoveElement.emit'),
        }
        const changeDetectorRef = {
            detectChanges: vi.fn().mockName('detectChanges'),
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
            changeDetectorRef,
        })

        eventShowModal.next({
            type: 'Read',
            geojson: movedFeature.geojson,
            origineData: 'data',
        })

        await vi.waitFor(() => {
            expect(eventMoveElement.emit).toHaveBeenCalledWith(movedFeature)
        })
        expect(changeDetectorRef.detectChanges).toHaveBeenCalledOnce()
        expect(mapService.setCenterInUrl).toHaveBeenCalledOnce()
    })
})
