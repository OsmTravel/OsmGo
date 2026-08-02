export function normalizeSearchText(value: unknown): string {
    return String(value ?? '')
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLocaleLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
}

export function includesNormalizedSearch(
    value: unknown,
    normalizedQuery: string
): boolean {
    return normalizeSearchText(value).includes(normalizedQuery)
}

export function nameToOsmKey(name: string): string {
    return String(name ?? '')
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/\/+/g, ':')
        .replace(/[^a-z\-_:]/gi, '')
        .replace(/_+/g, '_')
        .replace(/:+/g, ':')
        .replace(/_*:_*/g, ':')
        .replace(/^[-_:]+|[-_:]+$/g, '')
}

export function osmTagKeyToPresetId(key: string): string {
    return key.split(':').join('/')
}

export function presetIdMatchesQuery(
    presetId: string,
    queryId: string
): boolean {
    if (!queryId) return false
    return presetId === queryId || presetId.startsWith(`${queryId}/`)
}
