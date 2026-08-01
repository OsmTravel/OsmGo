import OhDate from '@scripts/YoHours/OhDate.js'
import OhRule from '@scripts/YoHours/OhRule.js'
import WideInterval from '@scripts/YoHours/WideInterval.js'

describe('YoHours input validation', () => {
    it('rejects invalid dates and accepts OhDate instances', () => {
        const rule = new OhRule()

        expect(() => rule.addDate({})).toThrow('Invalid parameter')
        expect(() => rule.addDate(new OhDate('', 'always', []))).not.toThrow()
    })

    it('only compares WideInterval instances', () => {
        const interval = new WideInterval().always()

        expect(interval.equals({ _type: 'always' })).toBe(false)
        expect(interval.equals(new WideInterval().always())).toBe(true)
    })
})
