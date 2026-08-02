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
