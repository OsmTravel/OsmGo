import type { OsmGoFeatureCollection } from '@osmgo/type'
import type { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { Subscription } from 'rxjs'

import { MapService } from './map.service'

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
        setPrivate(
            service,
            'mapSessionSubscriptions',
            new Subscription(unsubscribeSession)
        )
        setPrivate(
            service,
            'mapInitSubscription',
            new Subscription(unsubscribeInit)
        )
        setPrivate(service, 'mapEventCleanup', [firstCleanup, secondCleanup])

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
        return Object.create(MapService.prototype) as MapService
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
