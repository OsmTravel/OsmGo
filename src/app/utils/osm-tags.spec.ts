import {
    normalizedOsmTagMap,
    normalizeOsmTagKey,
    normalizeOsmTags,
    osmTagMapsEqual,
} from './osm-tags'

describe('OSM tag normalization', () => {
    it('keeps zero, trims strings and rejects invalid keys and values', () => {
        expect(
            normalizeOsmTags({
                ' level ': 0,
                name: '  Bench  ',
                empty: '   ',
                undefined: 'invalid key',
                ignored: undefined,
            })
        ).toEqual({ level: '0', name: 'Bench' })
        expect(normalizeOsmTagKey(undefined)).toBeUndefined()
    })

    it('compares canonical maps independently of input order and value type', () => {
        const first = normalizedOsmTagMap([
            { key: 'level', value: 0 },
            { key: 'name', value: 'Bench' },
        ])
        const second = normalizedOsmTagMap([
            { key: 'name', value: 'Bench' },
            { key: 'level', value: '0' },
        ])

        expect(osmTagMapsEqual(first, second)).toBe(true)
    })
})
