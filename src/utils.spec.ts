import { includesNormalizedSearch, normalizeSearchText } from '@osmgo/utils'

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
