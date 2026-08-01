import { Subject, throwError } from 'rxjs'

import { MainPage } from './main'

describe('MainPage', () => {
    it('keeps existing data and clears processing after a download failure', () => {
        const router = { events: new Subject() }
        const mapService = {
            eventShowDialogMultiFeatures: new Subject(),
            eventShowModal: new Subject(),
            eventNewBboxPolygon: jasmine.createSpyObj('EventEmitter', ['emit']),
            eventMarkerReDraw: jasmine.createSpyObj('EventEmitter', ['emit']),
            getBbox: () => [1, 2, 3, 4],
            setIsProcessing: jasmine.createSpy('setIsProcessing'),
        }
        const downloadError = new Error('Worker conversion failed')
        const osmApi = {
            getDataFromBbox: jasmine
                .createSpy('getDataFromBbox')
                .and.returnValue(throwError(() => downloadError)),
        }
        const dataService = jasmine.createSpyObj('DataService', [
            'setGeojsonBbox',
            'setGeojson',
        ])
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
            dataService,
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
        spyOn(console, 'error')
        spyOn(page, 'presentToast').and.resolveTo()

        page.loadData$().subscribe()

        expect(mapService.setIsProcessing.calls.allArgs()).toEqual([
            [true],
            [false],
        ])
        expect(dataService.setGeojsonBbox).not.toHaveBeenCalled()
        expect(dataService.setGeojson).not.toHaveBeenCalled()
        expect(page.presentToast).toHaveBeenCalledTimes(1)
        expect(
            (page.presentToast as jasmine.Spy).calls.mostRecent().args[0]
        ).toBe(downloadError)
    })
})
