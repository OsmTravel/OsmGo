import type { FilterSpecification, Map } from 'maplibre-gl'

import { MapService } from './map.service'

describe('MapService filters', () => {
    function createService(): MapService {
        return Object.create(MapService.prototype) as MapService
    }

    it('adds the measurement filter when enabled', () => {
        const setFilter = vi.fn().mockName('setFilter')
        const map = {
            getFilter: () => ['all'],
            setFilter,
        } as unknown as Map
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
            getFilter: () => initialFilter,
            setFilter,
        } as unknown as Map
        const service = createService()

        const filter = service.toogleMesureFilter(false, 'way_fill', 5_000, map)

        expect(filter).toEqual(['all', ['==', ['get', 'type'], 'way']])
        expect(initialFilter).toHaveLength(3)
        expect(setFilter).toHaveBeenCalledWith('way_fill', filter)
    })

    it('leaves a missing layer filter unchanged', () => {
        const setFilter = vi.fn().mockName('setFilter')
        const map = {
            getFilter: () => undefined,
            setFilter,
        } as unknown as Map
        const service = createService()

        expect(
            service.toogleMesureFilter(true, 'missing', 100, map)
        ).toBeUndefined()
        expect(setFilter).not.toHaveBeenCalled()
    })
})

describe('MapService aerial imagery', () => {
    it('uses the maximum tile zoom supplied by the imagery index', () => {
        const source = { type: 'raster' as const }
        const addSource = vi.fn(
            (_id: string, _specification: unknown) => undefined
        )
        const map = {
            addControl: vi.fn(),
            addLayer: vi.fn(),
            addSource: (
                id: string,
                specification: unknown
            ): ReturnType<typeof addSource> => {
                addSource(id, specification)
            },
            getLayer: vi.fn(() => undefined),
            getSource: vi.fn(() =>
                addSource.mock.calls.length > 0 ? source : undefined
            ),
            hasControl: vi.fn(() => false),
            removeControl: vi.fn(),
            removeLayer: vi.fn(),
            removeSource: vi.fn(),
        } as unknown as Map
        const service = Object.create(MapService.prototype) as MapService
        service.map = map
        Object.defineProperty(service, 'configService', {
            value: { config: () => ({ basemap: { id: 'legacy-basemap' } }) },
        })
        Object.defineProperty(service, 'isDisplaySatelliteBaseMapState', {
            value: { set: vi.fn() },
        })

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
})
