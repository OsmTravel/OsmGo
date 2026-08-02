import { resolveAppUrl } from './asset-url'

describe('resolveAppUrl', () => {
    it('keeps application assets inside a configured subpath', () => {
        expect(
            resolveAppUrl(
                'assets/mapStyle/sprites/sprites',
                'https://example.test/apps/osmgo/'
            )
        ).toBe(
            'https://example.test/apps/osmgo/assets/mapStyle/sprites/sprites'
        )
    })

    it('does not let a leading slash escape the application base', () => {
        expect(
            resolveAppUrl('/assets/i18n/en.json', 'https://example.test/osmgo/')
        ).toBe('https://example.test/osmgo/assets/i18n/en.json')
    })
})
