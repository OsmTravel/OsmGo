import { Feature, FeatureCollection, Geometry } from 'geojson';

export type OsmGoFeatureCollection = FeatureCollection<Geometry, FeatureProperties>;
export type OsmGoFeature = Feature<Geometry, FeatureProperties>;

export interface FeatureProperties{
    hexColor: string;
    icon: string;
    id: number;
    marker: string
    meta: MetaData
    primaryTag: PrimaryTag
    tags: any;
    type: string;
    way_geometry?: Geometry;
    usedByWays? : boolean;
    originalData: OsmGoFeature | null;
    changeType?: OsmGoChangeType;
}

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