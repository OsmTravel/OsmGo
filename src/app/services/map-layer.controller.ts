import { cloneDeep } from '@app/utils/clone'
import type { FilterSpecification, Map } from 'maplibre-gl'

export const FEATURE_VISIBILITY_LAYER_IDS = [
    'way_fill',
    'way_fill_changed',
    'way_line',
    'way_line_changed',
    'label',
    'label_changed',
    'icon-old',
    'icon-fixme',
    'marker',
    'marker_changed',
    'icon-change',
]

/** Applies idempotent mutations to MapLibre layers and their filters. */
export class MapLayerController {
    excludePropertyValues(
        map: Map,
        layerIds: string[],
        propertyName: string,
        values: string[]
    ): void {
        const uniqueValues = [...new Set(values.filter(Boolean))]
        for (const layerId of layerIds) {
            if (!map.getLayer(layerId)) continue
            const currentFilter = cloneDeep(map.getFilter(layerId))
            if (!Array.isArray(currentFilter)) continue
            const nextFilter = currentFilter.filter(
                (clause, index) =>
                    index === 0 ||
                    !this.isPropertyMatchFilter(clause, propertyName)
            )
            if (uniqueValues.length > 0) {
                nextFilter.push([
                    'match',
                    ['get', propertyName],
                    uniqueValues,
                    false,
                    true,
                ])
            }
            map.setFilter(layerId, nextFilter as FilterSpecification)
        }
    }

    toggleLessThanFilter(
        map: Map,
        layerId: string,
        propertyName: string,
        enabled: boolean,
        value: number
    ): FilterSpecification | undefined {
        return this.replaceComparisonFilter(
            map,
            layerId,
            propertyName,
            '<',
            enabled ? ['<', ['get', propertyName], value] : undefined
        )
    }

    replaceComparisonFilter(
        map: Map,
        layerId: string,
        propertyName: string,
        operator: string,
        replacement?: unknown[]
    ): FilterSpecification | undefined {
        if (!map.getLayer(layerId)) return undefined
        const currentFilter = cloneDeep(map.getFilter(layerId))
        if (!Array.isArray(currentFilter)) return undefined
        const nextFilter = currentFilter.filter(
            (clause, index) =>
                index === 0 ||
                !this.isPropertyComparisonFilter(clause, propertyName, operator)
        )
        if (replacement) nextFilter.push(replacement)
        const filter = nextFilter as FilterSpecification
        map.setFilter(layerId, filter)
        return filter
    }

    setVisibility(
        map: Map,
        layerId: string,
        visibility: 'visible' | 'none'
    ): boolean {
        if (!map.getLayer(layerId)) return false
        map.setLayoutProperty(layerId, 'visibility', visibility)
        return true
    }

    private isPropertyMatchFilter(
        value: unknown,
        propertyName: string
    ): boolean {
        if (!Array.isArray(value) || value[0] !== 'match') return false
        const getter = value[1]
        return (
            Array.isArray(getter) &&
            getter[0] === 'get' &&
            getter[1] === propertyName
        )
    }

    private isPropertyComparisonFilter(
        value: unknown,
        propertyName: string,
        operator: string
    ): boolean {
        if (
            !Array.isArray(value) ||
            value.length !== 3 ||
            value[0] !== operator
        ) {
            return false
        }
        return value.some(
            (part) =>
                Array.isArray(part) &&
                part[0] === 'get' &&
                part[1] === propertyName
        )
    }
}
