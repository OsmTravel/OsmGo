import { signal } from '@angular/core'
import type { OsmGoFeatureCollection } from '@osmgo/type'
import type { Config } from '@services/config.service'
import type { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { of, Subscription, throwError } from 'rxjs'
import { type MapInitializationError, MapService } from './map.service'
import { MapLayerController } from './map-layer.controller'
import { MapLifecycleController } from './map-lifecycle.controller'

describe('MapService initialization', () => {
    const config = {
        centerWhenGpsIsReady: false,
        lastView: { lng: 2, lat: 48, zoom: 18, bearing: 0 },
    } as Config

    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    function createService() {
        const service = Object.create(MapService.prototype) as MapService
        const errorState = signal<MapInitializationError | null>(null)
        Object.defineProperties(service, {
            lifecycle: { value: new MapLifecycleController() },
            mapCreated: { value: false, writable: true },
            styleReady: { value: false, writable: true },
            loadingDataState: { value: { set: vi.fn() } },
            mapInitializationErrorState: { value: errorState },
            mapInitializationError: { value: errorState.asReadonly() },
            _ngZone: { value: { run: (callback: () => void) => callback() } },
        })
        return service
    }

    it('turns a style request failure into a retryable state', () => {
        const service = createService()
        vi.spyOn(service, 'getMapStyle')
            .mockReturnValueOnce(throwError(() => new Error('offline')))
            .mockReturnValueOnce(of({ version: 8, sources: {}, layers: [] }))
        Object.defineProperties(service, {
            document: {
                value: {
                    createElement: () => ({ getContext: () => null }),
                },
            },
        })

        expect(() => service.initMap(config)).not.toThrow()
        expect(service.mapInitializationError()?.messageKey).toBe(
            'MAIN.MAP_INITIALIZATION.STYLE_FAILED'
        )

        service.retryMapInitialization()

        expect(service.getMapStyle).toHaveBeenCalledTimes(2)
        expect(service.mapInitializationError()?.messageKey).toBe(
            'MAIN.MAP_INITIALIZATION.WEBGL_REQUIRED'
        )
    })

    it('catches constructor failures without leaking a global error', () => {
        const service = createService()
        vi.spyOn(service, 'getMapStyle').mockReturnValue(
            of({ version: 8, sources: {}, layers: [] })
        )
        Object.defineProperties(service, {
            document: {
                value: {
                    createElement: () => ({ getContext: () => ({}) }),
                },
            },
            zone: {
                value: {
                    runOutsideAngular: (callback: () => void) => callback(),
                },
            },
        })
        vi.spyOn(
            service as unknown as {
                createMapInstance: () => MapLibreMap
            },
            'createMapInstance'
        ).mockImplementation(() => {
            throw new Error('GPU initialization failed')
        })

        expect(() => service.initMap(config)).not.toThrow()
        expect(service.mapInitializationError()?.messageKey).toBe(
            'MAIN.MAP_INITIALIZATION.CREATION_FAILED'
        )
    })

    it('removes a partially configured map after a setup failure', () => {
        const service = createService()
        const remove = vi.fn()
        const activeMap = {
            getZoom: () => 18,
            addControl: () => {
                throw new Error('Control setup failed')
            },
            remove,
        } as unknown as MapLibreMap
        vi.spyOn(service, 'getMapStyle').mockReturnValue(
            of({ version: 8, sources: {}, layers: [] })
        )
        Object.defineProperties(service, {
            document: {
                value: {
                    createElement: () => ({ getContext: () => ({}) }),
                },
            },
            zone: {
                value: {
                    runOutsideAngular: (callback: () => void) => callback(),
                },
            },
            configService: { value: { setCurrentZoom: vi.fn() } },
        })
        vi.spyOn(
            service as unknown as {
                createMapInstance: () => MapLibreMap
            },
            'createMapInstance'
        ).mockReturnValue(activeMap)

        service.initMap(config)

        expect(remove).toHaveBeenCalledOnce()
        expect(service.map).toBeUndefined()
        expect(service.mapInitializationError()?.messageKey).toBe(
            'MAIN.MAP_INITIALIZATION.CREATION_FAILED'
        )
    })
})

describe('MapService lifecycle', () => {
    const setPrivate = (service: MapService, key: string, value: unknown) => {
        Object.defineProperty(service, key, {
            value,
            writable: true,
            configurable: true,
        })
    }

    it('tears one map session down exactly once', () => {
        const service = Object.create(MapService.prototype) as MapService
        const removeMap = vi.fn()
        const removePositionMarker = vi.fn()
        const removeMoveMarker = vi.fn()
        const firstCleanup = vi.fn()
        const secondCleanup = vi.fn()
        const unsubscribeSession = vi.fn()
        const unsubscribeInit = vi.fn()
        service.map = { remove: removeMap } as unknown as MapLibreMap
        service.layersAreLoaded = true
        service.markerPositionate = {
            remove: removePositionMarker,
        } as never
        service.markerMove = { remove: removeMoveMarker } as never
        setPrivate(service, 'mapCreated', true)
        setPrivate(service, 'styleReady', true)
        setPrivate(service, 'loadingDataState', { set: vi.fn() })
        setPrivate(service, 'markerMovingState', { set: vi.fn() })
        setPrivate(service, 'markerMoveMovingState', { set: vi.fn() })
        const lifecycle = new MapLifecycleController()
        lifecycle.trackSession(new Subscription(unsubscribeSession))
        lifecycle.trackInitialization(new Subscription(unsubscribeInit))
        lifecycle.trackCleanup(firstCleanup, secondCleanup)
        setPrivate(service, 'lifecycle', lifecycle)

        service.destroyMap()
        service.destroyMap()

        expect(unsubscribeInit).toHaveBeenCalledOnce()
        expect(unsubscribeSession).toHaveBeenCalledOnce()
        expect(secondCleanup).toHaveBeenCalledBefore(firstCleanup)
        expect(removePositionMarker).toHaveBeenCalledOnce()
        expect(removeMoveMarker).toHaveBeenCalledOnce()
        expect(removeMap).toHaveBeenCalledOnce()
        expect(service.layersAreLoaded).toBe(false)
    })

    it('replaces movement markers instead of accumulating sessions', () => {
        const service = Object.create(MapService.prototype) as MapService
        const firstMarker = { addTo: vi.fn(), remove: vi.fn() }
        const secondMarker = { addTo: vi.fn(), remove: vi.fn() }
        service.map = {
            getCenter: () => ({ lng: 2, lat: 48 }),
        } as unknown as MapLibreMap
        setPrivate(service, 'markerMovingState', { set: vi.fn() })
        setPrivate(service, 'markerMoveMovingState', { set: vi.fn() })
        vi.spyOn(service, 'createDomMoveMarker')
            .mockReturnValueOnce(firstMarker as never)
            .mockReturnValueOnce(secondMarker as never)

        service.positionateMarker()
        service.positionateMarker()
        service.cancelNewMarker()

        expect(firstMarker.addTo).toHaveBeenCalledOnce()
        expect(firstMarker.remove).toHaveBeenCalledOnce()
        expect(secondMarker.addTo).toHaveBeenCalledOnce()
        expect(secondMarker.remove).toHaveBeenCalledOnce()
    })
})

describe('MapService filters', () => {
    function createService(): MapService {
        const service = Object.create(MapService.prototype) as MapService
        Object.defineProperty(service, 'layerController', {
            value: new MapLayerController(),
        })
        return service
    }

    it('adds the measurement filter when enabled', () => {
        const setFilter = vi.fn().mockName('setFilter')
        const map = {
            getLayer: () => ({ id: 'way_fill' }),
            getFilter: () => ['all'],
            setFilter,
        } as unknown as MapLibreMap
        const service = createService()

        const filter = service.toogleMesureFilter(true, 'way_fill', 5_000, map)

        expect(filter).toEqual(['all', ['<', ['get', 'mesure'], 5_000]])
        expect(setFilter).toHaveBeenCalledWith('way_fill', filter)
    })

    it('removes the measurement filter when disabled', () => {
        const initialFilter: FilterSpecification = [
            'all',
            ['<', ['get', 'mesure'], 5_000],
            ['==', ['get', 'type'], 'way'],
        ]
        const setFilter = vi.fn().mockName('setFilter')
        const map = {
            getLayer: () => ({ id: 'way_fill' }),
            getFilter: () => initialFilter,
            setFilter,
        } as unknown as MapLibreMap
        const service = createService()

        const filter = service.toogleMesureFilter(false, 'way_fill', 5_000, map)

        expect(filter).toEqual(['all', ['==', ['get', 'type'], 'way']])
        expect(initialFilter).toHaveLength(3)
        expect(setFilter).toHaveBeenCalledWith('way_fill', filter)
    })

    it('leaves a missing layer filter unchanged', () => {
        const setFilter = vi.fn().mockName('setFilter')
        const map = {
            getLayer: () => undefined,
            getFilter: () => undefined,
            setFilter,
        } as unknown as MapLibreMap
        const service = createService()

        expect(
            service.toogleMesureFilter(true, 'missing', 100, map)
        ).toBeUndefined()
        expect(setFilter).not.toHaveBeenCalled()
    })

    it('replaces an existing measurement clause instead of stacking it', () => {
        let filter: FilterSpecification = ['all']
        const map = {
            getLayer: () => ({ id: 'way_fill' }),
            getFilter: () => filter,
            setFilter: (_layer: string, next: FilterSpecification) => {
                filter = next
            },
        } as unknown as MapLibreMap
        const service = createService()

        service.toogleMesureFilter(true, 'way_fill', 5_000, map)
        service.toogleMesureFilter(true, 'way_fill', 2_500, map)

        expect(filter).toEqual(['all', ['<', ['get', 'mesure'], 2_500]])
    })

    it('applies and clears hidden tags on official and pending layers', () => {
        const filters = new Map<string, FilterSpecification>([
            ['marker', ['all']],
            ['marker_changed', ['all']],
            ['way_fill_changed', ['all']],
        ])
        const map = {
            getLayer: (id: string) =>
                filters.has(id) ? ({ id } as unknown) : undefined,
            getFilter: (id: string) => filters.get(id),
            setFilter: (id: string, filter: FilterSpecification) =>
                filters.set(id, filter),
        } as unknown as MapLibreMap
        const service = createService()
        service.map = map
        Object.defineProperty(service, 'mapCreated', { value: true })
        service.layersAreLoaded = true

        service.filterMakerByIds(['amenity/bench', 'amenity/bench'])
        service.filterMakerByIds(['amenity/bench'])

        for (const filter of filters.values()) {
            expect(filter).toEqual([
                'all',
                ['match', ['get', 'configId'], ['amenity/bench'], false, true],
            ])
        }

        service.filterMakerByIds([])
        for (const filter of filters.values()) expect(filter).toEqual(['all'])
    })

    it('keeps one numeric old-tag threshold across repeated updates', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-08-02T10:00:00.000Z'))
        let filter: FilterSpecification = ['all']
        const setFilter = vi.fn((_layer: string, next: FilterSpecification) => {
            filter = next
        })
        const map = {
            getLayer: () => ({ id: 'icon-old' }),
            getFilter: () => filter,
            setFilter,
            setLayoutProperty: vi.fn(),
        } as unknown as MapLibreMap
        const service = createService()
        service.map = map
        Object.defineProperty(service, 'mapCreated', { value: true })
        service.layersAreLoaded = true

        service.showOldTagIcon(3)
        service.showOldTagIcon(5)

        expect(filter).toHaveLength(2)
        expect(filter[1]).toEqual([
            '>',
            Date.now() - 31_536_000_000 * 5,
            ['get', 'time'],
        ])
        expect(typeof (filter[1] as unknown[])[1]).toBe('number')
        vi.useRealTimers()
    })
})

describe('MapService heading normalization', () => {
    it.each([
        [0, 0, 0],
        [10, 350, 20],
        [350, 10, 340],
        [720, -360, 0],
    ])('normalizes %s° against a %s° bearing', (heading, bearing, expected) => {
        const service = Object.create(MapService.prototype) as MapService

        expect(service.getIconRotate(heading, bearing)).toBe(expected)
    })
})

describe('MapService URL synchronization', () => {
    function createService(
        params: Record<string, string | null>,
        navigate: ReturnType<typeof vi.fn>
    ): MapService {
        const service = Object.create(MapService.prototype) as MapService
        service.map = {
            getCenter: () => ({ lng: 2.123456789, lat: 48.987654321 }),
            getZoom: () => 18.126,
        } as unknown as MapLibreMap
        Object.defineProperties(service, {
            activatedRoute: {
                value: {
                    snapshot: {
                        queryParamMap: {
                            get: (key: string) => params[key] ?? null,
                        },
                    },
                },
            },
            router: { value: { navigate } },
            _ngZone: {
                value: {
                    run: (callback: () => Promise<boolean>) => callback(),
                },
            },
            pendingMapUrlSignature: { value: undefined, writable: true },
        })
        return service
    }

    it('skips navigation when the rounded map URL is already current', () => {
        const navigate = vi.fn(() => Promise.resolve(true))
        const service = createService(
            {
                center: '2.1234568,48.9876543',
                zoom: '18.13',
                id: null,
                add: null,
            },
            navigate
        )

        service.setCenterInUrl()

        expect(navigate).not.toHaveBeenCalled()
    })

    it('coalesces pending updates and observes navigation failures', async () => {
        let rejectNavigation!: (reason: unknown) => void
        const navigate = vi.fn(
            () =>
                new Promise<boolean>((_resolve, reject) => {
                    rejectNavigation = reject
                })
        )
        const service = createService({}, navigate)
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)

        service.setCenterInUrl()
        service.setCenterInUrl()

        expect(navigate).toHaveBeenCalledOnce()
        expect(navigate).toHaveBeenCalledWith([], {
            replaceUrl: true,
            relativeTo: expect.anything(),
            queryParams: {
                center: '2.1234568,48.9876543',
                zoom: '18.13',
                id: null,
                add: null,
            },
            queryParamsHandling: 'merge',
        })

        rejectNavigation(new Error('navigation rejected'))
        await vi.waitFor(() => expect(consoleError).toHaveBeenCalledOnce())

        navigate.mockResolvedValueOnce(true)
        service.setCenterInUrl()
        expect(navigate).toHaveBeenCalledTimes(2)
        consoleError.mockRestore()
    })
})

describe('MapService redraw ordering', () => {
    const setPrivate = (service: MapService, key: string, value: unknown) => {
        Object.defineProperty(service, key, {
            value,
            writable: true,
            configurable: true,
        })
    }

    it('ignores an older render that finishes after the latest one', async () => {
        const service = Object.create(MapService.prototype) as MapService
        const dataSource = { setData: vi.fn() }
        const waysSource = { setData: vi.fn() }
        const map = {
            hasImage: () => true,
            getSource: (id: string) =>
                id === 'data' ? dataSource : waysSource,
        } as unknown as MapLibreMap
        service.map = map
        setPrivate(service, 'mapCreated', true)
        setPrivate(service, 'layersAreLoaded', true)
        setPrivate(service, 'officialRenderRevision', 0)
        setPrivate(service, 'pendingRenderRevision', 0)
        setPrivate(service, 'activeRenderCount', 0)
        setPrivate(service, 'loadingDataState', { set: vi.fn() })
        let resolveFirst!: () => void
        let resolveSecond!: () => void
        const firstIcons = new Promise<void>((resolve) => {
            resolveFirst = resolve
        })
        const secondIcons = new Promise<void>((resolve) => {
            resolveSecond = resolve
        })
        vi.spyOn(service, 'addMissingIconsToMap')
            .mockReturnValueOnce(firstIcons)
            .mockReturnValueOnce(secondIcons)
        const first: OsmGoFeatureCollection = {
            type: 'FeatureCollection',
            features: [],
        }
        const second: OsmGoFeatureCollection = {
            type: 'FeatureCollection',
            features: [],
        }
        const render = (
            service as unknown as {
                renderMarkerCollection(
                    collection: OsmGoFeatureCollection,
                    target: 'official'
                ): Promise<void>
            }
        ).renderMarkerCollection.bind(service)

        const older = render(first, 'official')
        const latest = render(second, 'official')
        resolveSecond()
        await latest
        resolveFirst()
        await older

        expect(dataSource.setData).toHaveBeenCalledOnce()
        expect(dataSource.setData).toHaveBeenCalledWith(second)
        expect(waysSource.setData).toHaveBeenCalledOnce()
    })

    it('uses a generated fallback while preserving the requested image ID', async () => {
        const service = Object.create(MapService.prototype) as MapService
        const addImage = vi.fn()
        const map = {
            hasImage: () => false,
            addImage,
        } as unknown as MapLibreMap
        const fallbackBitmap = {} as ImageBitmap
        vi.spyOn(service, 'generateIconFromSprite')
            .mockRejectedValueOnce(new Error('Missing sprite'))
            .mockResolvedValueOnce({
                id: 'circle-#000000-maki-circle',
                blob: fallbackBitmap,
            })

        await service.addMissingIconsToMap(['circle-#000000-missing'], map)

        expect(addImage).toHaveBeenCalledWith(
            'circle-#000000-missing',
            fallbackBitmap,
            { pixelRatio: 1 }
        )
    })
})

describe('MapService aerial imagery', () => {
    function createHarness() {
        const sources = new Map<string, unknown>()
        const layers = new Set<string>(['bboxLayer'])
        const controls = new Set<unknown>()
        const addSource = vi.fn((id: string, source: unknown) => {
            sources.set(id, source)
        })
        const removeSource = vi.fn((id: string) => {
            sources.delete(id)
        })
        const addLayer = vi.fn((layer: { id: string }) => {
            if (layers.has(layer.id)) throw new Error('Layer already exists')
            layers.add(layer.id)
        })
        const removeLayer = vi.fn((id: string) => {
            layers.delete(id)
        })
        const setLayoutProperty = vi.fn()
        const addControl = vi.fn((control: unknown) => controls.add(control))
        const removeControl = vi.fn((control: unknown) =>
            controls.delete(control)
        )
        const map = {
            addControl,
            addLayer,
            addSource,
            getLayer: (id: string) =>
                layers.has(id) ? ({ id } as unknown) : undefined,
            getSource: (id: string) => sources.get(id),
            hasControl: (control: unknown) => controls.has(control),
            removeControl,
            removeLayer,
            removeSource,
            setLayoutProperty,
        } as unknown as MapLibreMap
        const service = Object.create(MapService.prototype) as MapService
        service.map = map
        Object.defineProperty(service, 'isDisplaySatelliteBaseMapState', {
            value: { set: vi.fn() },
        })
        Object.defineProperty(service, 'basemapSourceFingerprint', {
            value: null,
            writable: true,
        })
        Object.defineProperty(service, 'basemapAttributionText', {
            value: '',
            writable: true,
        })
        return {
            addControl,
            addLayer,
            addSource,
            removeControl,
            removeLayer,
            removeSource,
            service,
            setLayoutProperty,
        }
    }

    it('uses the maximum tile zoom supplied by the imagery index', () => {
        const { addSource, service } = createHarness()

        service.displaySatelliteBaseMap(
            {
                id: 'test-imagery',
                name: 'Test imagery',
                tiles: ['https://example.test/{z}/{x}/{y}.jpeg'],
                max_zoom: 19,
            },
            true
        )

        expect(addSource).toHaveBeenCalledWith(
            'basemap',
            expect.objectContaining({ maxzoom: 19 })
        )
    })

    it('switches A to B to A without retaining stale sources', () => {
        const { addLayer, addSource, removeLayer, removeSource, service } =
            createHarness()
        const mapA = {
            id: 'a',
            name: 'A',
            tiles: ['https://a.test/{z}/{x}/{y}.png'],
        }
        const mapB = {
            id: 'b',
            name: 'B',
            tiles: ['https://b.test/{z}/{x}/{y}.png'],
        }

        service.displaySatelliteBaseMap(mapA, true)
        service.displaySatelliteBaseMap(mapB, true)
        service.displaySatelliteBaseMap(mapA, true)

        expect(addSource).toHaveBeenCalledTimes(3)
        expect(removeSource).toHaveBeenCalledTimes(2)
        expect(addLayer).toHaveBeenCalledTimes(3)
        expect(removeLayer).toHaveBeenCalledTimes(2)
        expect(addSource.mock.calls.at(-1)?.[1]).toEqual(
            expect.objectContaining({ tiles: mapA.tiles })
        )
    })

    it('does not recreate a source or layer for identical updates', () => {
        const { addLayer, addSource, removeLayer, removeSource, service } =
            createHarness()
        const basemap = {
            id: 'a',
            name: 'A',
            tiles: ['https://a.test/{z}/{x}/{y}.png'],
        }

        service.displaySatelliteBaseMap(basemap, true)
        service.displaySatelliteBaseMap(basemap, true)

        expect(addSource).toHaveBeenCalledTimes(1)
        expect(addLayer).toHaveBeenCalledTimes(1)
        expect(removeSource).not.toHaveBeenCalled()
        expect(removeLayer).not.toHaveBeenCalled()
    })

    it('toggles visibility without recreating the basemap', () => {
        const {
            addLayer,
            addSource,
            removeLayer,
            removeSource,
            service,
            setLayoutProperty,
        } = createHarness()
        const basemap = {
            id: 'a',
            name: 'A',
            tiles: ['https://a.test/{z}/{x}/{y}.png'],
        }

        service.displaySatelliteBaseMap(basemap, true)
        service.displaySatelliteBaseMap(basemap, false)
        service.displaySatelliteBaseMap(basemap, true)

        expect(addSource).toHaveBeenCalledTimes(1)
        expect(addLayer).toHaveBeenCalledTimes(1)
        expect(removeSource).not.toHaveBeenCalled()
        expect(removeLayer).not.toHaveBeenCalled()
        expect(setLayoutProperty.mock.calls).toEqual([
            ['basemap', 'visibility', 'none'],
            ['basemap', 'visibility', 'visible'],
        ])
    })

    it('updates attribution without replacing identical tiles', () => {
        const { addControl, addSource, removeControl, service } =
            createHarness()
        const tiles = ['https://a.test/{z}/{x}/{y}.png']

        service.displaySatelliteBaseMap(
            { id: 'a', name: 'A', tiles, attribution: { text: 'Source A' } },
            true
        )
        service.displaySatelliteBaseMap(
            { id: 'b', name: 'B', tiles, attribution: { text: 'Source B' } },
            true
        )

        expect(addSource).toHaveBeenCalledTimes(1)
        expect(addControl).toHaveBeenCalledTimes(2)
        expect(removeControl).toHaveBeenCalledTimes(1)
    })
})
