import { IsBookmarkedPipe } from './is-bookmarked.pipe'

describe('IsBookmarkedPipe', () => {
    it('create an instance', () => {
        const pipe = new IsBookmarkedPipe()
        expect(pipe).toBeTruthy()
    })
})
