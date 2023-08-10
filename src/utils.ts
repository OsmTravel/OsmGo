export function nameToOsmKey(name: string) {
    return name
        .toLowerCase()
        .replace(' ', '_')
        .replace('/', ':')
        .replace(/[^a-z\-_:]/gi, '')
}
