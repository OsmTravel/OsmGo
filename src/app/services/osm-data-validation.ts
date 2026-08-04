import type {
    OsmGoChangeType,
    OsmGoFeature,
    OsmGoFeatureCollection,
    OsmRelationMember,
} from '@osmgo/type'
import type { Geometry, Position } from 'geojson'

const OSM_TYPES = ['node', 'way', 'relation'] as const
type OsmType = (typeof OSM_TYPES)[number]

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const fail = (label: string, detail: string): never => {
    throw new Error(`${label}: ${detail}`)
}

const requirePosition = (value: unknown, label: string): Position => {
    if (
        !Array.isArray(value) ||
        value.length < 2 ||
        typeof value[0] !== 'number' ||
        typeof value[1] !== 'number' ||
        !Number.isFinite(value[0]) ||
        !Number.isFinite(value[1]) ||
        value[0] < -180 ||
        value[0] > 180 ||
        value[1] < -90 ||
        value[1] > 90
    ) {
        fail(label, 'contains an invalid coordinate')
    }
    return value as Position
}

const requirePositions = (
    value: unknown,
    minimum: number,
    label: string
): Position[] => {
    if (!Array.isArray(value) || value.length < minimum) {
        fail(label, 'contains too few coordinates')
    }
    return (value as unknown[]).map((position) =>
        requirePosition(position, label)
    )
}

const requireRing = (value: unknown, label: string): Position[] => {
    const ring = requirePositions(value, 4, label)
    const first = ring[0]
    const last = ring[ring.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) {
        fail(label, 'contains an open polygon ring')
    }
    return ring
}

export const requireGeoJsonGeometry = (
    value: unknown,
    label: string
): Geometry => {
    if (!isRecord(value) || typeof value['type'] !== 'string') {
        fail(label, 'has no valid geometry')
    }
    const geometry = value as Record<string, unknown>
    switch (geometry['type']) {
        case 'Point':
            requirePosition(geometry['coordinates'], label)
            break
        case 'MultiPoint':
            requirePositions(geometry['coordinates'], 1, label)
            break
        case 'LineString':
            requirePositions(geometry['coordinates'], 2, label)
            break
        case 'MultiLineString':
            if (
                !Array.isArray(geometry['coordinates']) ||
                geometry['coordinates'].length === 0
            ) {
                fail(label, 'contains no line')
            }
            ;(geometry['coordinates'] as unknown[]).forEach((line) => {
                requirePositions(line, 2, label)
            })
            break
        case 'Polygon':
            if (
                !Array.isArray(geometry['coordinates']) ||
                geometry['coordinates'].length === 0
            ) {
                fail(label, 'contains no polygon ring')
            }
            ;(geometry['coordinates'] as unknown[]).forEach((ring) => {
                requireRing(ring, label)
            })
            break
        case 'MultiPolygon':
            if (
                !Array.isArray(geometry['coordinates']) ||
                geometry['coordinates'].length === 0
            ) {
                fail(label, 'contains no polygon')
            }
            ;(geometry['coordinates'] as unknown[]).forEach((polygon) => {
                if (!Array.isArray(polygon) || polygon.length === 0) {
                    fail(label, 'contains an empty polygon')
                }
                ;(polygon as unknown[]).forEach((ring) => {
                    requireRing(ring, label)
                })
            })
            break
        case 'GeometryCollection':
            if (
                !Array.isArray(geometry['geometries']) ||
                geometry['geometries'].length === 0
            ) {
                fail(label, 'contains no geometry')
            }
            ;(geometry['geometries'] as unknown[]).forEach((childGeometry) => {
                requireGeoJsonGeometry(childGeometry, label)
            })
            break
        default:
            fail(label, `uses unsupported geometry ${geometry['type']}`)
    }
    return structuredClone(value) as Geometry
}

const requireTags = (
    value: unknown,
    label: string
): Record<string, string | number> => {
    if (!isRecord(value)) fail(label, 'has invalid tags')
    const tags = value as Record<string, unknown>
    for (const [key, tagValue] of Object.entries(tags)) {
        if (
            key.trim() === '' ||
            (typeof tagValue !== 'string' && typeof tagValue !== 'number') ||
            (typeof tagValue === 'number' && !Number.isFinite(tagValue))
        ) {
            fail(label, `has an invalid tag ${key || '<empty>'}`)
        }
    }
    return structuredClone(value) as Record<string, string | number>
}

const requireMembers = (value: unknown, label: string): OsmRelationMember[] => {
    if (!Array.isArray(value)) fail(label, 'has invalid relation members')
    return (value as unknown[]).map((member) => {
        if (
            !isRecord(member) ||
            !OSM_TYPES.includes(member['type'] as OsmType) ||
            !/^-?[1-9]\d*$/.test(String(member['ref'])) ||
            typeof member['role'] !== 'string'
        ) {
            fail(label, 'has an invalid relation member')
        }
        return structuredClone(member) as unknown as OsmRelationMember
    })
}

export type OsmFeatureState = 'official' | 'pending' | 'any'

export const requireOsmGoFeature = (
    value: unknown,
    label: string,
    state: OsmFeatureState = 'any',
    validationPath = new WeakSet<object>()
): OsmGoFeature => {
    if (!isRecord(value) || value['type'] !== 'Feature') {
        fail(label, 'is not a GeoJSON feature')
    }
    const feature = value as Record<string, unknown>
    if (validationPath.has(feature)) {
        fail(label, 'contains a cyclic feature snapshot')
    }
    validationPath.add(feature)
    const rawProperties = feature['properties']
    if (!isRecord(rawProperties)) fail(label, 'has invalid properties')
    const properties = rawProperties as Record<string, unknown>
    const type = properties['type']
    const objectId = properties['id']
    const id = feature['id']
    if (
        !OSM_TYPES.includes(type as OsmType) ||
        !Number.isSafeInteger(objectId) ||
        objectId === 0 ||
        id !== `${type}/${objectId}`
    ) {
        fail(label, 'has an inconsistent OSM identity')
    }

    requireGeoJsonGeometry(feature['geometry'], label)
    requireTags(properties['tags'], label)
    const rawMeta = properties['meta']
    if (
        !isRecord(rawMeta) ||
        !Number.isInteger(rawMeta['version']) ||
        Number(rawMeta['version']) < 0
    ) {
        fail(label, 'has invalid OSM metadata')
    }
    const meta = rawMeta as Record<string, unknown>
    if (
        typeof properties['marker'] !== 'string' ||
        typeof properties['icon'] !== 'string' ||
        typeof properties['hexColor'] !== 'string' ||
        !isRecord(properties['primaryTag']) ||
        typeof properties['primaryTag']['key'] !== 'string' ||
        !['string', 'number'].includes(typeof properties['primaryTag']['value'])
    ) {
        fail(label, 'has invalid rendering properties')
    }

    const changeType = properties['changeType'] as OsmGoChangeType | undefined
    if (state === 'official' && changeType !== undefined) {
        fail(label, 'has a pending operation in official data')
    }
    if (
        state === 'pending' &&
        !['Create', 'Update', 'Delete'].includes(String(changeType))
    ) {
        fail(label, 'has no valid pending operation')
    }
    if (changeType === 'Create') {
        if (Number(objectId) >= 0 || Number(meta['version']) !== 0) {
            fail(label, 'has an invalid create operation')
        }
    } else if (
        (state === 'official' ||
            changeType === 'Update' ||
            changeType === 'Delete') &&
        (Number(objectId) < 1 || Number(meta['version']) < 1)
    ) {
        fail(label, 'has an invalid persisted OSM version')
    }

    if (type === 'way') {
        if (!Array.isArray(feature['ndRefs']) || feature['ndRefs'].length < 2) {
            fail(label, 'has invalid way node references')
        }
        if (
            (feature['ndRefs'] as unknown[]).some(
                (reference) => !/^-?[1-9]\d*$/.test(String(reference))
            )
        ) {
            fail(label, 'has an invalid way node reference')
        }
    } else if (type === 'relation') {
        requireMembers(feature['members'], label)
    }

    const originalData = properties['originalData']
    if (
        state === 'pending' &&
        changeType !== 'Create' &&
        originalData === undefined
    ) {
        fail(label, 'has no original feature snapshot')
    }
    if (originalData !== undefined && originalData !== null) {
        const original = requireOsmGoFeature(
            originalData,
            `${label} original data`,
            'official',
            validationPath
        )
        if (original.id !== id) {
            fail(label, 'has mismatched original feature data')
        }
    }
    validationPath.delete(feature)
    return structuredClone(value) as unknown as OsmGoFeature
}

export const requireOsmGoFeatureCollection = (
    value: unknown,
    label: string,
    state: OsmFeatureState = 'any'
): OsmGoFeatureCollection => {
    if (
        !isRecord(value) ||
        value['type'] !== 'FeatureCollection' ||
        !Array.isArray(value['features'])
    ) {
        fail(label, 'is not a feature collection')
    }
    const collection = value as Record<string, unknown>
    const features = (collection['features'] as unknown[]).map(
        (feature, index) =>
            requireOsmGoFeature(feature, `${label} feature ${index}`, state)
    )
    if (new Set(features.map(({ id }) => id)).size !== features.length) {
        fail(label, 'contains duplicate feature IDs')
    }
    return { type: 'FeatureCollection', features }
}

export const requireGeometryFeatureCollection = (
    value: unknown,
    label: string
): OsmGoFeatureCollection => {
    if (
        !isRecord(value) ||
        value['type'] !== 'FeatureCollection' ||
        !Array.isArray(value['features'])
    ) {
        fail(label, 'is not a feature collection')
    }
    const collection = value as Record<string, unknown>
    const features = (collection['features'] as unknown[]).map(
        (feature, index) => {
            if (!isRecord(feature) || feature['type'] !== 'Feature') {
                fail(`${label} feature ${index}`, 'is invalid')
            }
            const geometryFeature = feature as Record<string, unknown>
            requireGeoJsonGeometry(
                geometryFeature['geometry'],
                `${label} feature ${index}`
            )
            return structuredClone(geometryFeature) as unknown as OsmGoFeature
        }
    )
    return { type: 'FeatureCollection', features }
}

export interface ValidatedMapDataResult {
    geojson: OsmGoFeatureCollection
    geojsonBbox: OsmGoFeatureCollection
}

export const requireMapDataResult = <Result = ValidatedMapDataResult>(
    value: unknown,
    label = 'OSM map data'
): Result => {
    if (!isRecord(value)) fail(label, 'is invalid')
    const result = value as Record<string, unknown>
    return {
        geojson: requireOsmGoFeatureCollection(
            result['geojson'],
            `${label} features`,
            'official'
        ),
        geojsonBbox: requireGeometryFeatureCollection(
            result['geojsonBbox'],
            `${label} bbox`
        ),
    } as Result
}
