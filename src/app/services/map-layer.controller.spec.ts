import type { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl'

import { MapLayerController } from './map-layer.controller'

describe('MapLayerController', () => {
    const createMap = (initial: FilterSpecification = ['all']) => {
        let filter = initial
        const map = {
            getLayer: (id: string) => (id === 'layer' ? { id } : undefined),
            getFilter: () => filter,
            setFilter: (_id: string, next: FilterSpecification) => {
                filter = next
            },
            setLayoutProperty: vi.fn(),
        } as unknown as MapLibreMap
        return { map, getFilter: () => filter }
    }

    it('replaces property exclusions instead of stacking filters', () => {
        const controller = new MapLayerController()
        const fixture = createMap()

        controller.excludePropertyValues(fixture.map, ['layer'], 'configId', [
            'one',
            'one',
        ])
        controller.excludePropertyValues(fixture.map, ['layer'], 'configId', [
            'two',
        ])

        expect(fixture.getFilter()).toEqual([
            'all',
            ['match', ['get', 'configId'], ['two'], false, true],
        ])
    })

    it('toggles one comparison while preserving unrelated clauses', () => {
        const controller = new MapLayerController()
        const fixture = createMap([
            'all',
            ['==', ['get', 'type'], 'way'],
            ['<', ['get', 'mesure'], 100],
        ])

        controller.toggleLessThanFilter(
            fixture.map,
            'layer',
            'mesure',
            true,
            50
        )
        expect(fixture.getFilter()).toEqual([
            'all',
            ['==', ['get', 'type'], 'way'],
            ['<', ['get', 'mesure'], 50],
        ])

        controller.toggleLessThanFilter(
            fixture.map,
            'layer',
            'mesure',
            false,
            50
        )
        expect(fixture.getFilter()).toEqual([
            'all',
            ['==', ['get', 'type'], 'way'],
        ])
    })

    it('does not mutate a missing layer', () => {
        const controller = new MapLayerController()
        const fixture = createMap()

        expect(
            controller.setVisibility(fixture.map, 'missing', 'visible')
        ).toBe(false)
        expect(
            controller.toggleLessThanFilter(
                fixture.map,
                'missing',
                'mesure',
                true,
                50
            )
        ).toBeUndefined()
        expect(fixture.map.setLayoutProperty).not.toHaveBeenCalled()
    })
})
