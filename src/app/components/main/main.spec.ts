import { Subject, throwError } from 'rxjs'
import type { Mock } from 'vitest'

import { MainPage } from './main'

describe('MainPage', () => {
    it('keeps existing data and clears processing after a download failure', () => {
        const router = { events: new Subject() }
        const mapService = {
            eventShowDialogMultiFeatures: new Subject(),
            eventShowModal: new Subject(),
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
        const ngZone = { run: (callback) => callback() }
        const page = new MainPage(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            osmApi as any,
            {} as any,
            mapService as any,
            dataService as any,
            {} as any,
            alertService as any,
            configService as any,
            {} as any,
            ngZone as any,
            router as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any
        )
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
})
