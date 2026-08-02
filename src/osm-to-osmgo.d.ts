declare module '@scripts/osmToOsmgo/index.js' {
    import type {
        OsmGoFeature,
        OsmGoFeatureCollection,
        TagConfig,
    } from '@osmgo/type'
    import type {
        Feature,
        FeatureCollection,
        MultiPolygon,
        Polygon,
    } from 'geojson'

    export interface ConvertOptions {
        tagConfig: readonly TagConfig[]
        primaryKeys: readonly string[]
        oldGeojson?: OsmGoFeatureCollection
        geojsonChanged?: OsmGoFeatureCollection
        oldBboxFeature?: Feature<Polygon | MultiPolygon>
        limitFeatures?: number
    }

    export interface ConvertResult {
        geojson: OsmGoFeatureCollection
        geojsonBbox: FeatureCollection<Polygon | MultiPolygon> | null
    }

    export function getConfigTag(
        feature: OsmGoFeature,
        tagsConfig: readonly TagConfig[]
    ): TagConfig

    export function addAttributesToFeature<T extends OsmGoFeature>(
        feature: T
    ): void

    export function setIconStyle<T extends OsmGoFeature>(
        feature: T,
        tagsConfig: readonly TagConfig[]
    ): T

    export function wayToPoint<T extends OsmGoFeature>(feature: T): void

    export function convert(
        osmData: unknown,
        options: ConvertOptions
    ): ConvertResult
}
