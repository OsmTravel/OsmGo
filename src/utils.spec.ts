import {
    includesNormalizedSearch,
    nameToOsmKey,
    normalizeSearchText,
    osmTagKeyToPresetId,
    presetIdMatchesQuery,
} from '@osmgo/utils'

describe('search normalization', () => {
    it.each(['[', '(', '\\', '.'])('treats %s as literal text', (query) => {
        const normalizedQuery = normalizeSearchText(query)

        expect(() =>
            includesNormalizedSearch(`value ${query} suffix`, normalizedQuery)
        ).not.toThrow()
        expect(
            includesNormalizedSearch(`value ${query} suffix`, normalizedQuery)
        ).toBe(true)
    })

    it('matches accents and repeated whitespace consistently', () => {
        expect(
            includesNormalizedSearch(
                '  Café   de la Paix ',
                normalizeSearchText('cafe de   la paix')
            )
        ).toBe(true)
    })

    it('matches every value for an empty normalized query', () => {
        expect(
            includesNormalizedSearch('anything', normalizeSearchText('  '))
        ).toBe(true)
    })
})

describe('OSM key and preset identifiers', () => {
    it('normalizes Unicode, whitespace and every slash in a custom key', () => {
        expect(nameToOsmKey('  Réf   locale / sous / clé  ')).toBe(
            'ref_locale:sous:cle'
        )
        expect(osmTagKeyToPresetId('contact:social:twitter')).toBe(
            'contact/social/twitter'
        )
    })

    it('matches exact preset branches without sibling substring matches', () => {
        expect(
            presetIdMatchesQuery('contact/phone/mobile', 'contact/phone')
        ).toBe(true)
        expect(presetIdMatchesQuery('contact/telephone', 'contact/tel')).toBe(
            false
        )
    })
})
