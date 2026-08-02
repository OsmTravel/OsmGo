import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute, Router } from '@angular/router'
import { SwUpdate } from '@angular/service-worker'
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
import { firstValueFrom, of, Subject, throwError } from 'rxjs'
import type { Mock } from 'vitest'

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
    featureChoiceRequested$: Subject<unknown>
    mapBackgroundClick$: Subject<void>
    showModal$: Subject<unknown>
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
        featureChoiceRequested$: new Subject(),
        mapBackgroundClick$: new Subject(),
        markerMoveMoving: signal(false),
        markerMoving: signal(false),
        showModal$: new Subject(),
        setCenterInUrl: vi.fn(),
        ...mapService,
    } as MainPageMapServiceStub
    const resolvedAlertService = {
        newAlert$: new Subject(),
        displayRefreshTooltip$: new Subject(),
        showAlert: vi.fn(),
        requestRefreshTooltip: vi.fn(),
        ...alertService,
    }
    const resolvedConfigService = {
        freezeMapRenderer: false,
        ...configService,
    }
    const router = { events: new Subject(), navigate: vi.fn() }
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
        providers: [
            { provide: MatDialog, useValue: modalCtrl },
            { provide: MatSnackBar, useValue: {} },
            { provide: OsmApiService, useValue: osmApi },
            { provide: TagsService, useValue: {} },
            { provide: MapService, useValue: resolvedMapService },
            { provide: DataService, useValue: dataService },
            { provide: LocationService, useValue: {} },
            { provide: AlertService, useValue: resolvedAlertService },
            { provide: ConfigService, useValue: resolvedConfigService },
            { provide: Router, useValue: router },
            { provide: TranslateService, useValue: {} },
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
        router,
    }
}

describe('MainPage', () => {
    it('updates menu state and renderer state together', () => {
        const { page, configService } = createPage()

        page.openMenu()

        expect(page.menuIsOpen()).toBe(true)
        expect(configService.freezeMapRenderer).toBe(true)

        page.closeMenu()

        expect(page.menuIsOpen()).toBe(false)
        expect(configService.freezeMapRenderer).toBe(false)
    })

    it('opens and deactivates the routed overlay without destroying the map page', () => {
        const { page, configService } = createPage()

        page.onOverlayActivate({})

        expect(page.overlayOpen()).toBe(true)
        expect(page.overlaySize()).toBe('standard')
        expect(configService.freezeMapRenderer).toBe(true)

        page.onOverlayDeactivate()

        expect(page.overlayOpen()).toBe(false)
        expect(configService.freezeMapRenderer).toBe(false)
    })

    it('protects an overlay workflow that cannot be closed yet', () => {
        const { page, router } = createPage()
        page.onOverlayActivate({ canCloseOverlay: () => false })

        page.closeOverlay()

        expect(router.navigate).not.toHaveBeenCalled()
    })

    it('closes a routed overlay while preserving map query parameters', () => {
        const { page, router } = createPage()
        page.onOverlayActivate({})

        page.closeOverlay()

        expect(router.navigate).toHaveBeenCalledWith(['/'], {
            queryParamsHandling: 'preserve',
            replaceUrl: true,
        })
    })

    it('stops reacting to modal requests after destruction', () => {
        const showModal$ = new Subject<unknown>()
        const modalCtrl = { open: vi.fn().mockName('MatDialog.open') }
        createPage({
            modalCtrl,
            mapService: { showModal$ },
        })

        TestBed.resetTestingModule()
        showModal$.next({
            type: 'Read',
            geojson: { id: 'node/1' },
            origineData: 'data',
        })

        expect(modalCtrl.open).not.toHaveBeenCalled()
    })

    it('opens a read selection in the mobile bottom sheet', () => {
        const showModal$ = new Subject<any>()
        const feature = { id: 'node/1' }
        const modalCtrl = { open: vi.fn() }
        const { page } = createPage({
            modalCtrl,
            mapService: { showModal$ },
        })

        showModal$.next({
            type: 'Read',
            geojson: feature,
            origineData: 'data',
        })

        expect(page.selectedFeature()).toEqual({
            type: 'Read',
            geojson: feature,
            origineData: 'data',
        })
        expect(page.sheetLevel()).toBe('medium')
        expect(modalCtrl.open).not.toHaveBeenCalled()
    })

    it('hides the selected sheet while its marker is being moved', () => {
        const showModal$ = new Subject<any>()
        const markerMoveMoving = signal(false)
        const feature = { id: 'node/1' }
        const { page } = createPage({
            mapService: { showModal$, markerMoveMoving },
        })

        showModal$.next({
            type: 'Read',
            geojson: feature,
            origineData: 'data',
        })

        expect(page.displayedSelection()?.geojson).toBe(feature)

        markerMoveMoving.set(true)

        expect(page.displayedSelection()).toBeNull()
        expect(page.selectedFeature()?.geojson).toBe(feature)
        expect(page.mapControlsBottom()).toBe(
            'max(46px, calc(env(safe-area-inset-bottom) + 42px))'
        )

        markerMoveMoving.set(false)

        expect(page.displayedSelection()?.geojson).toBe(feature)
    })

    it('closes the selected sheet after a click on the map background', () => {
        const showModal$ = new Subject<any>()
        const mapBackgroundClick$ = new Subject<void>()
        const { page, router } = createPage({
            mapService: { showModal$, mapBackgroundClick$ },
        })

        showModal$.next({
            type: 'Read',
            geojson: { id: 'node/1' },
            origineData: 'data',
        })
        mapBackgroundClick$.next()

        expect(page.selectedFeature()).toBeNull()
        expect(page.sheetLevel()).toBe('medium')
        expect(router.navigate).toHaveBeenCalledWith([], {
            replaceUrl: true,
            relativeTo: expect.anything(),
            queryParams: { id: null },
            queryParamsHandling: 'merge',
        })
    })

    it('ignores map background clicks when no sheet is open', () => {
        const mapBackgroundClick$ = new Subject<void>()
        const { router } = createPage({
            mapService: { mapBackgroundClick$ },
        })

        mapBackgroundClick$.next()

        expect(router.navigate).not.toHaveBeenCalled()
    })

    it('routes edit requests into the expanded object sheet', () => {
        const showModal$ = new Subject<{
            type: string
            geojson: { id: string }
            origineData: string
        }>()
        const modalCtrl = {
            open: vi.fn(),
        }
        const feature = { id: 'node/1' }
        const { page, configService } = createPage({
            modalCtrl,
            mapService: {
                showModal$,
                setCenterInUrl: vi.fn(),
            },
        })

        showModal$.next({
            type: 'Update',
            geojson: feature,
            origineData: 'data',
        })

        expect(page.selectedFeature()).toEqual({
            type: 'Update',
            geojson: feature,
            origineData: 'data',
        })
        expect(page.sheetLevel()).toBe('expanded')
        expect(modalCtrl.open).not.toHaveBeenCalled()
        expect(configService.freezeMapRenderer).toBe(false)
    })

    it('ignores map background clicks while editing', () => {
        const showModal$ = new Subject<any>()
        const mapBackgroundClick$ = new Subject<void>()
        const { page, router } = createPage({
            mapService: { showModal$, mapBackgroundClick$ },
        })

        showModal$.next({
            type: 'Update',
            geojson: { id: 'node/1' },
            origineData: 'data',
        })
        mapBackgroundClick$.next()

        expect(page.selectedFeature()?.type).toBe('Update')
        expect(router.navigate).not.toHaveBeenCalled()
    })

    it('keeps existing data and clears processing after a download failure', () => {
        const mapService = {
            redrawBbox: vi.fn().mockName('redrawBbox'),
            redrawMarkers: vi.fn().mockName('redrawMarkers'),
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
            applyDownload: vi.fn().mockName('DataService.applyDownload'),
        }
        const alertService = {
            newAlert$: new Subject(),
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
        expect(dataService.applyDownload).not.toHaveBeenCalled()
        expect(page.presentToast).toHaveBeenCalledTimes(1)
        expect(page.presentToast).toHaveBeenCalledWith(
            'Worker conversion failed'
        )
    })

    it('persists a complete download atomically before redrawing it', async () => {
        let acknowledgeDownload!: () => void
        const persisted = new Promise<void>((resolve) => {
            acknowledgeDownload = resolve
        })
        const result = {
            geojson: { type: 'FeatureCollection', features: [] },
            geojsonBbox: { type: 'FeatureCollection', features: [] },
        }
        const applyDownload = vi.fn().mockReturnValue(persisted)
        const mapService = {
            redrawBbox: vi.fn(),
            redrawMarkers: vi.fn(),
            getBbox: () => [1, 2, 3, 4],
            setIsProcessing: vi.fn(),
        }
        const { page } = createPage({
            osmApi: { getDataFromBbox: () => of(result) },
            dataService: { applyDownload },
            mapService,
            alertService: {
                newAlert$: new Subject(),
                displayToolTipRefreshData: true,
            },
            configService: {
                getLimitFeatures: () => 100,
                freezeMapRenderer: false,
            },
        })

        const completed = firstValueFrom(page.loadData$())
        await Promise.resolve()

        expect(applyDownload).toHaveBeenCalledWith(result)
        expect(mapService.redrawMarkers).not.toHaveBeenCalled()

        acknowledgeDownload()
        await completed

        expect(mapService.redrawBbox).toHaveBeenCalledWith(result.geojsonBbox)
        expect(mapService.redrawMarkers).toHaveBeenCalledWith(result.geojson)
        expect(mapService.setIsProcessing).toHaveBeenLastCalledWith(false)
    })

    it('keeps existing data when the worker result is incomplete', () => {
        const mapService = {
            redrawBbox: vi.fn(),
            redrawMarkers: vi.fn(),
            getBbox: () => [1, 2, 3, 4],
            setIsProcessing: vi.fn(),
        }
        const dataService = {
            applyDownload: vi.fn(),
        }
        const { page } = createPage({
            osmApi: {
                getDataFromBbox: () =>
                    of({
                        geojson: { type: 'FeatureCollection', features: [] },
                    }),
            },
            mapService,
            dataService,
            alertService: {
                newAlert$: new Subject(),
                displayToolTipRefreshData: true,
            },
            configService: {
                getLimitFeatures: () => 100,
                freezeMapRenderer: false,
            },
        })
        vi.spyOn(console, 'error').mockReturnValue(undefined)
        vi.spyOn(page, 'presentToast').mockResolvedValue()

        page.loadData$().subscribe()

        expect(dataService.applyDownload).not.toHaveBeenCalled()
        expect(mapService.setIsProcessing).toHaveBeenLastCalledWith(false)
        expect(page.presentToast).toHaveBeenCalledWith(
            'The map worker returned invalid data.'
        )
    })

    it('forwards marker movement from the unified sheet', () => {
        const showModal$ = new Subject<any>()
        const moveElement = vi.fn().mockName('moveElement')
        const movedFeature = {
            type: 'Move',
            geojson: { id: 'node/1' },
            mode: 'Update',
        }
        const { page } = createPage({
            mapService: {
                showModal$,
                moveElement,
                setCenterInUrl: vi.fn(),
            },
        })

        showModal$.next({
            type: 'Update',
            geojson: movedFeature.geojson,
            origineData: 'data',
        })
        page.handleSheetSession(movedFeature as any)

        expect(moveElement).toHaveBeenCalledWith(movedFeature)
        expect(page.selectedFeature()?.geojson).toBe(movedFeature.geojson)
    })
})
