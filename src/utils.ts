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

export function nameToOsmKey(name: string) {
    return name
        .toLowerCase()
        .replace(' ', '_')
        .replace('/', ':')
        .replace(/[^a-z\-_:]/gi, '')
}
