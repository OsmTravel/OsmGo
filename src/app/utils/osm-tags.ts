import type { Tag } from '@osmgo/type'

export const MAX_OSM_TAG_LENGTH = 255

const containsInvalidControlCharacter = (value: string): boolean =>
    Array.from(value).some((character) => {
        const codePoint = character.codePointAt(0) ?? 0
        return (
            codePoint <= 8 ||
            codePoint === 11 ||
            codePoint === 12 ||
            (codePoint >= 14 && codePoint <= 31) ||
            (codePoint >= 127 && codePoint <= 159)
        )
    })

const normalizeTagText = (value: string): string =>
    value.normalize('NFC').trim()

export const normalizeOsmTagKey = (key: unknown): string | undefined => {
    if (typeof key !== 'string') return undefined
    const normalized = normalizeTagText(key)
    return normalized !== '' && normalized !== 'undefined'
        ? normalized
        : undefined
}

export const normalizeOsmTagValue = (value: unknown): string | undefined => {
    if (value === null || value === undefined) return undefined
    const normalized = normalizeTagText(String(value))
    return normalized === '' ? undefined : normalized
}

export const normalizedOsmTagMap = (
    tags: Iterable<{ key: unknown; value: unknown }>
): Map<string, string> => {
    const normalized = new Map<string, string>()
    for (const tag of tags) {
        const key = normalizeOsmTagKey(tag.key)
        const value = normalizeOsmTagValue(tag.value)
        if (key && value !== undefined) normalized.set(key, value)
    }
    return normalized
}

export const normalizeOsmTags = (
    tags: Record<string, unknown>
): Record<string, string> =>
    Object.fromEntries(
        normalizedOsmTagMap(
            Object.entries(tags).map(([key, value]) => ({ key, value }))
        )
    )

export const normalizeEditorTags = (tags: Tag[]): Tag[] =>
    tags.map((tag) => {
        const key = normalizeOsmTagKey(tag.key)
        const value = normalizeOsmTagValue(tag.value)
        return {
            ...tag,
            key: key ?? '',
            value: value ?? '',
        }
    })

export const requireValidOsmTag = (
    keyInput: unknown,
    valueInput: unknown
): { key: string; value: string } => {
    const key = normalizeOsmTagKey(keyInput)
    const value = normalizeOsmTagValue(valueInput)
    if (
        !key ||
        value === undefined ||
        Array.from(key).length > MAX_OSM_TAG_LENGTH ||
        Array.from(value).length > MAX_OSM_TAG_LENGTH ||
        containsInvalidControlCharacter(key) ||
        containsInvalidControlCharacter(value)
    ) {
        throw new Error('Invalid OSM tag key or value.')
    }
    return { key, value }
}

export const osmTagMapsEqual = (
    left: Map<string, string>,
    right: Map<string, string>
): boolean => {
    if (left.size !== right.size) return false
    for (const [key, value] of left) {
        if (right.get(key) !== value) return false
    }
    return true
}
