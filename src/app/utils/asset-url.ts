export function resolveAppUrl(path: string, baseUri: string): string {
    return new URL(path.replace(/^\/+/, ''), baseUri).toString()
}
