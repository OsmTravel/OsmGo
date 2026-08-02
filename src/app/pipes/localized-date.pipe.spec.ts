import { formatLocalizedDate, LocalizedDatePipe } from './localized-date.pipe'

describe('LocalizedDatePipe', () => {
    const pipe = new LocalizedDatePipe()

    it('formats dates using the requested user locale', () => {
        expect(pipe.transform('2022-06-27', 'fr-FR')).toBe('27/06/2022')
        expect(pipe.transform('2022-06-27', 'en-US')).toBe('06/27/2022')
    })

    it('keeps date-only values stable across time zones', () => {
        expect(formatLocalizedDate('2024-01-01', 'fr-FR')).toBe('01/01/2024')
    })

    it('supports Unix timestamps expressed in seconds', () => {
        expect(pipe.transform(1_656_288_000, 'fr-FR')).toBe('27/06/2022')
    })

    it('returns an empty string for missing or invalid dates', () => {
        expect(pipe.transform(null, 'fr-FR')).toBe('')
        expect(pipe.transform('not-a-date', 'fr-FR')).toBe('')
    })
})
