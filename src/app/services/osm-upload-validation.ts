import { isNodeUsedByWay } from '@app/utils/osm-feature'
import type { OsmGoChangeType, OsmGoFeature } from '@osmgo/type'

const OSM_TYPES = ['node', 'way', 'relation'] as const

const containsInvalidXmlCharacter = (value: string): boolean =>
    Array.from(value).some((character) => {
        const code = character.charCodeAt(0)
        return code < 32 && code !== 9 && code !== 10 && code !== 13
    })

const invalidQueue = (): never => {
    throw new Error('The local OSM upload queue is invalid.')
}

const isValidOsmReference = (value: unknown): boolean =>
    /^-?[1-9]\d*$/.test(String(value))

const validateTags = (tags: unknown): void => {
    if (!tags || typeof tags !== 'object' || Array.isArray(tags)) invalidQueue()
    for (const [key, value] of Object.entries(
        tags as Record<string, unknown>
    )) {
        if (
            key.length === 0 ||
            key.length > 255 ||
            containsInvalidXmlCharacter(key) ||
            (typeof value !== 'string' && typeof value !== 'number')
        ) {
            invalidQueue()
        }
        const serialized = String(value)
        if (
            serialized.length > 255 ||
            containsInvalidXmlCharacter(serialized) ||
            (typeof value === 'number' && !Number.isFinite(value))
        ) {
            invalidQueue()
        }
    }
}

const validatePointGeometry = (feature: OsmGoFeature): void => {
    const geometry = feature.geometry
    if (geometry?.type !== 'Point') return invalidQueue()
    const [longitude, latitude] = geometry.coordinates
    if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
    ) {
        invalidQueue()
    }
}

export interface ValidatedUploadFeature {
    id: string
    operation: OsmGoChangeType
}

export const validateOsmUploadFeature = (
    feature: OsmGoFeature
): ValidatedUploadFeature => {
    const properties = feature?.properties
    if (!properties || typeof properties !== 'object') invalidQueue()
    const type = properties.type
    const objectId = properties.id
    if (
        !OSM_TYPES.includes(type as (typeof OSM_TYPES)[number]) ||
        !Number.isSafeInteger(objectId) ||
        objectId === 0 ||
        feature.id !== `${type}/${objectId}`
    ) {
        invalidQueue()
    }

    const changeType = properties.changeType
    if (!['Create', 'Update', 'Delete'].includes(String(changeType))) {
        invalidQueue()
    }
    validateTags(properties.tags)

    if (changeType === 'Create') {
        if (objectId >= 0 || type !== 'node') invalidQueue()
        validatePointGeometry(feature)
    } else {
        if (
            objectId < 1 ||
            !Number.isInteger(properties.meta?.version) ||
            properties.meta.version < 1
        ) {
            invalidQueue()
        }
        if (type === 'node') {
            validatePointGeometry(feature)
        } else if (type === 'way') {
            if (
                !Array.isArray(feature.ndRefs) ||
                feature.ndRefs.length < 2 ||
                feature.ndRefs.some(
                    (reference) => !isValidOsmReference(reference)
                )
            ) {
                invalidQueue()
            }
        } else if (
            !Array.isArray(feature.members) ||
            feature.members.some(
                (member) =>
                    !OSM_TYPES.includes(member?.type) ||
                    !isValidOsmReference(member?.ref) ||
                    typeof member?.role !== 'string' ||
                    containsInvalidXmlCharacter(member.role)
            )
        ) {
            invalidQueue()
        }
    }

    const operation =
        changeType === 'Delete' && isNodeUsedByWay(feature)
            ? 'Update'
            : changeType
    return { id: String(feature.id), operation: operation! }
}
