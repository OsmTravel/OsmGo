import { MinutesToHoursMinutesPipe } from './minutes-to-hours-minutes.pipe'

describe('MinutesToHoursMinutesPipe', () => {
    it('create an instance', () => {
        const pipe = new MinutesToHoursMinutesPipe()
        expect(pipe).toBeTruthy()
    })
})
