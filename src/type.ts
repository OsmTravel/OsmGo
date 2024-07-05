import { Point } from '@turf/turf'
import {
    Feature,
    FeatureCollection,
    Geometry,
    LineString,
    MultiLineString,
    MultiPoint,
} from 'geojson'
import { Marker } from 'maplibre-gl'
import { MultiPolygon, Polygon } from 'martinez-polygon-clipping'

/**
 * Osm Go! specific geojson feature collection.

 */
export interface OsmGoFeatureCollection {
    type: 'FeatureCollection'
    features: OsmGoFeature[]
}

/**
 * Osm Go! specific geojson feature.
 *
 * Contains a specific set of features and any possible geometry.
 */
export type OsmGoFeature<G extends Geometry = Geometry> = Feature<
    G,
    FeatureProperties
> & {
    id: string | undefined
}

/**
 * Osm Go! specific geojson feature properties.
 */
export interface FeatureProperties {
    /** Color of the marker as a hexadecimal string */
    hexColor: string
    /** Config marker icon or empty string. */
    icon: string
    id: number
    /** Identifier of the marker in the form "<shape>-<color>-<icon>" */
    marker: string
    /**
     * Meta information about the last change of the feature, e.g. timestamp and
     * author information.
     */
    meta: MetaData
    primaryTag: PrimaryTag
    tags: any
    type: string
    way_geometry?: Geometry
    /** If true, the node is used by a way, otherwise false. */
    usedByWays?: boolean
    /**
     * Contains the original data of a feature in case it has been modified.
     * Needed to revert changes in case the user decides to undo her changes.
     */
    originalData: OsmGoFeature | null
    /** Type of change by the user */
    changeType?: OsmGoChangeType
}

/**
 * Identifier for any operation that changes the underlying geojson data of an
 * object.
 */
export type OsmGoChangeType = 'Create' | 'Update' | 'Delete'

export interface PrimaryTag {
    key: string
    value: string | number
}

interface MetaData {
    changeset: string
    timestamp: string
    uid: string
    user: string
    version: number
}

export interface Tag {
    key: string
    value: string | number
    isDefaultValue?: boolean
    preset?: any
    isJustAdded?: boolean
}

export interface PresetOption {
    lbl: any
    v: string
}

export interface Preset {
    key: string
    lbl: any
    options?: PresetOption[]
    type: string
    placeholder?: string
    snake_case?: boolean
    _id: string
    optionsFromJson?: string
}

export interface TagConfig {
    key: string
    icon: string
    markerColor: string
    presets: string[]
    lbl?: any
    terms?: Record<string, string>
    description?: any
    geometry: string[]
    iDRef?: string
    tags: any
    moreFields?: string[]
    id: string
    isUserTag?: boolean
}

export interface TapTagsJson {
    primaryKeys: string[]
    tags: TagConfig[]
}

export type TapPresetsJson = Record<string, Preset>

export interface Iso6391Language {
    code: string
    '639-2': string
    family: string
    name: string
    nativeName: string
    wikiUrl: string
}
export type Iso6391LanguageCodeJson = Record<string, Iso6391Language>

export type FeatureIdSource = 'data' | 'data_changed'

export type MapMode = 'Read' | 'Create' | 'Update' | 'Delete' // FIXME: @dotcs Is this valid?

export class OsmGoMarker<T = any> extends Marker {
    id: string
    data: T
}

export type JsonSprites = Record<string, Sprite>

export interface Sprite {
    x: number
    y: number
    width: number
    height: number
    pixelRatio: number
}

/** List of tags as found in `src/assets/tagsAndPresets/tags.json` */
export interface TagsJson {
    primaryKeys: string[]
    tags: TagConfig[]
}

export interface CompassHeading {
    magneticHeading: number
    trueHeading: number
    headingAccuracy: null
    timestamp: number
}

export interface EventShowModal {
    type: MapMode
    geojson: OsmGoFeature
    newPosition?: boolean
    origineData: FeatureIdSource
    openPrimaryTagModalOnStart?: boolean
}

/**
 * ISO 3166-1 numeric and alpha-2 country codes of a country.
 *
 * See: https://www.iban.com/country-codes
 * See: https://en.wikipedia.org/wiki/ISO_3166-1_numeric
 */
export interface CountryCode {
    /** Human readable country name. */
    name: string
    /** Alpha-2 country code. */
    code: string
    /** Numeric ISO 3166-1 country code */
    'country-code': string
}
