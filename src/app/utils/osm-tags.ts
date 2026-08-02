import type { Tag } from '@osmgo/type'

export const normalizeOsmTagKey = (key: unknown): string | undefined => {
    if (typeof key !== 'string') return undefined
    const normalized = key.trim()
    return normalized !== '' && normalized !== 'undefined'
        ? normalized
        : undefined
}

export const normalizeOsmTagValue = (value: unknown): string | undefined => {
    if (value === null || value === undefined) return undefined
    const normalized = String(value).trim()
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
