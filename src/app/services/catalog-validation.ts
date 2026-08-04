import type { JsonSprites, Preset, TagConfig, TagsJson } from '@osmgo/type'

export const CATALOG_CACHE_SCHEMA_VERSION = 1

export interface CatalogCache<T> {
    schemaVersion: typeof CATALOG_CACHE_SCHEMA_VERSION
    value: T
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0

const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every(isNonEmptyString)

const isLocalizedText = (value: unknown): boolean =>
    isRecord(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every((text) => typeof text === 'string')

const isTagValueRecord = (value: unknown): boolean =>
    isRecord(value) &&
    Object.keys(value).length > 0 &&
    Object.entries(value).every(
        ([key, tagValue]) =>
            isNonEmptyString(key) &&
            (typeof tagValue === 'string' || typeof tagValue === 'number')
    )

const supportedGeometries = new Set([
    'point',
    'vertex',
    'line',
    'area',
    'relation',
])

const isTagConfig = (value: unknown): value is TagConfig =>
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.icon) &&
    /^#[0-9a-f]{6}$/i.test(String(value.markerColor)) &&
    isStringArray(value.geometry) &&
    value.geometry.length > 0 &&
    value.geometry.every((geometry) => supportedGeometries.has(geometry)) &&
    isStringArray(value.presets) &&
    (value.moreFields === undefined || isStringArray(value.moreFields)) &&
    isTagValueRecord(value.tags)

const isPreset = (value: unknown): value is Preset => {
    if (
        !isRecord(value) ||
        !isNonEmptyString(value.type) ||
        !isLocalizedText(value.lbl)
    ) {
        return false
    }
    const keys = [
        ...(isNonEmptyString(value.key) ? [value.key] : []),
        ...(isStringArray(value.keys) ? value.keys : []),
    ]
    if (keys.length === 0) return false
    if (value.options !== undefined) {
        if (!Array.isArray(value.options)) return false
        for (const option of value.options) {
            if (!isRecord(option) || !isNonEmptyString(option.v)) return false
            if (option.lbl !== undefined && !isLocalizedText(option.lbl)) {
                return false
            }
        }
    }
    return true
}

const invalidCatalog = (resource: string): never => {
    throw new Error(`Invalid ${resource} catalog.`)
}

export function requireTagsCatalog(value: unknown): TagsJson {
    if (
        !isRecord(value) ||
        !isStringArray(value.primaryKeys) ||
        value.primaryKeys.length === 0 ||
        new Set(value.primaryKeys).size !== value.primaryKeys.length ||
        !Array.isArray(value.tags) ||
        value.tags.length === 0 ||
        !value.tags.every(isTagConfig)
    ) {
        return invalidCatalog('tags')
    }
    const tags = value.tags as TagConfig[]
    const tagIds = tags.map((tag) => tag.id)
    if (
        new Set(tagIds).size !== tagIds.length ||
        !tags.every((tag) =>
            Object.keys(tag.tags).some((key) =>
                (value.primaryKeys as string[]).includes(key)
            )
        )
    ) {
        return invalidCatalog('tags')
    }
    return value as unknown as TagsJson
}

export function requirePresetCatalog(
    value: unknown,
    resource: 'presets' | 'brands'
): Record<string, Preset> {
    if (
        !isRecord(value) ||
        Object.keys(value).length === 0 ||
        !Object.entries(value).every(
            ([id, preset]) =>
                isNonEmptyString(id) &&
                (resource === 'brands'
                    ? id.endsWith('#brand')
                    : !id.endsWith('#brand')) &&
                isPreset(preset)
        )
    ) {
        return invalidCatalog(resource)
    }
    return value as Record<string, Preset>
}

export function requireSpriteCatalog(value: unknown): JsonSprites {
    if (
        !isRecord(value) ||
        Object.keys(value).length === 0 ||
        !Object.entries(value).every(([id, sprite]) => {
            if (!isNonEmptyString(id) || !isRecord(sprite)) return false
            return ['x', 'y', 'width', 'height', 'pixelRatio'].every((key) => {
                const coordinate = sprite[key]
                return (
                    typeof coordinate === 'number' &&
                    Number.isFinite(coordinate) &&
                    coordinate >= 0 &&
                    (key === 'x' || key === 'y' || coordinate > 0)
                )
            })
        })
    ) {
        return invalidCatalog('sprites')
    }
    return value as JsonSprites
}

export function requireCatalogCache<T>(
    value: unknown,
    validate: (candidate: unknown) => T
): CatalogCache<T> {
    if (
        !isRecord(value) ||
        value.schemaVersion !== CATALOG_CACHE_SCHEMA_VERSION ||
        !('value' in value)
    ) {
        throw new Error('Invalid or outdated catalog cache.')
    }
    return {
        schemaVersion: CATALOG_CACHE_SCHEMA_VERSION,
        value: validate(value.value),
    }
}
