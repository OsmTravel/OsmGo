import type { OsmGoFeature } from '@osmgo/type'

export const isNodeUsedByWay = (feature: OsmGoFeature): boolean => {
    const usedByWays = feature.properties.usedByWays
    return (
        usedByWays === true ||
        (Array.isArray(usedByWays) && usedByWays.length > 0)
    )
}
