export function invertTmsY(y: number, z: number): number {
    return 2 ** z - y - 1
}

export function buildTileTestUrl(
    template: string,
    x: number,
    y: number,
    z: number,
    bbox: number[],
    quadkey: string
): string {
    return template
        .replaceAll('{x}', String(x))
        .replaceAll('{y}', String(y))
        .replaceAll('{-y}', String(invertTmsY(y, z)))
        .replaceAll('{z}', String(z))
        .replaceAll('{bbox-epsg-3857}', bbox.join(','))
        .replaceAll('{quadkey}', quadkey)
}

export function compareImageryPriority(
    left: { properties: { best?: boolean; local?: boolean } },
    right: { properties: { best?: boolean; local?: boolean } }
): number {
    const bestDifference =
        Number(Boolean(right.properties.best)) -
        Number(Boolean(left.properties.best))
    if (bestDifference !== 0) return bestDifference
    return (
        Number(Boolean(right.properties.local)) -
        Number(Boolean(left.properties.local))
    )
}
