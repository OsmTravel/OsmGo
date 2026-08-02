import { RelativeTimePipe } from './relative-time.pipe'

describe('RelativeTimePipe', () => {
    const now = new Date('2026-08-01T12:00:00Z')
    let pipe: RelativeTimePipe

    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(now)
        pipe = new RelativeTimePipe()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('selects a readable unit for past dates', () => {
        expect(pipe.transform('2026-08-01T11:59:30Z', 'en')).toBe(
            '30 seconds ago'
        )
        expect(pipe.transform('2026-08-01T11:58:59Z', 'en')).toBe(
            '1 minute ago'
        )
        expect(pipe.transform('2026-08-01T10:00:00Z', 'en')).toBe('2 hours ago')
        expect(pipe.transform('2026-07-29T12:00:00Z', 'en')).toBe('3 days ago')
        expect(pipe.transform('2026-05-01T12:00:00Z', 'en')).toBe(
            '3 months ago'
        )
        expect(pipe.transform('2024-08-01T12:00:00Z', 'en')).toBe('2 years ago')
    })

    it('formats future dates', () => {
        expect(pipe.transform('2026-08-01T12:05:00Z', 'en')).toBe(
            'in 5 minutes'
        )
    })

    it('uses the requested locale', () => {
        expect(pipe.transform('2026-07-30T12:00:00Z', 'fr')).toBe('avant-hier')
    })

    it('can always express an elapsed duration', () => {
        expect(pipe.transform('2025-08-01T12:00:00Z', 'fr', 'always')).toBe(
            'il y a 1 an'
        )
    })

    it('returns an empty string for missing or invalid dates', () => {
        expect(pipe.transform(null, 'en')).toBe('')
        expect(pipe.transform('not-a-date', 'en')).toBe('')
    })
})
