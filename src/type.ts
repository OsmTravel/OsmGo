import { Feature, FeatureCollection, Geometry } from 'geojson';

/** 
 * Osm Go! specific geojson feature collection.
 * 
 * All contained features have a specific set of feature properties and any
 * possible geometry.
 */
export type OsmGoFeatureCollection = FeatureCollection<Geometry, FeatureProperties>;
/**
 * Osm Go! specific geojson feature.
 * 
 * Contains a specific set of features and any possible geometry.
 */
export type OsmGoFeature = Feature<Geometry, FeatureProperties>;

/**
 * Osm Go! specific geojson feature properties.
 */
export interface FeatureProperties{
    /** Color of the marker as a hexadecimal string */
    hexColor: string;
    /** Config marker icon or empty string. */
    icon: string;
    id: number;
    /** Identifier of the marker in the form "<shape>-<color>-<icon>" */
    marker: string
    /** 
     * Meta information about the last change of the feature, e.g. timestamp and
     * author information.
     */
    meta: MetaData
    primaryTag: PrimaryTag
    tags: any;
    type: string;
    way_geometry?: Geometry;
    /** If true, the node is used by a way, otherwise false. */
    usedByWays? : boolean;
    /** 
     * Contains the original data of a feature in case it has been modified.
     * Needed to revert changes in case the user decides to undo her changes.
     */
    originalData: OsmGoFeature | null;
    /** Type of change by the user */
    changeType?: OsmGoChangeType;
}

/** 
 * Identifier for any operation that changes the underlying geojson data of an
 * object.
 */
export type OsmGoChangeType = 'Create' | 'Update' | 'Delete';

export interface PrimaryTag{
    key: string;
    value: string;
}

interface MetaData{
    changeset: string;
    timestamp: string;
    uid: string;
    user: string;
    version: number
}

export interface Tag{
    key: string;
    value: string | number;
    isDefaultValue? : boolean
    preset? :any;
}

export interface PresetOption{
    lbl: any;
    v: string;
}

export interface Preset{
    key:string;
    lbl: any;
    options?: PresetOption[];
    type: string;
    placeholder?: string;
    snake_case?: boolean;
    _id: string;
    optionsFromJson? : string;
}


export interface TagConfig{
    key:string;
    icon: string;
    markerColor: string;
    presets: string[];
    lbl?: any;
    terms?: any;
    description?: any;
    geometry : string[];
    iDRef?: string;
    tags: any;
    moreFields?: string[];
    id: string;
    isUserTag?: boolean;

}

export type FeatureIdSource = 'data' | 'data_changed';