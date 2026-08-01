import { ModalPrimaryTag } from './modal.primaryTag'

describe('ModalPrimaryTag swipes', () => {
    const pointerAt = (clientX: number): PointerEvent =>
        ({ clientX } as PointerEvent)

    const createModal = (): ModalPrimaryTag =>
        new ModalPrimaryTag(
            { data: { tagConfig: null } } as any,
            null,
            null,
            null
        )

    it('shows bookmarks after a left swipe', () => {
        const modal = createModal()

        modal.startSwipe(pointerAt(100))
        modal.endSwipe(pointerAt(40))

        expect(modal.displayType).toBe('bookmarks')
    })

    it('shows recent tags after a right swipe', () => {
        const modal = createModal()

        modal.startSwipe(pointerAt(40))
        modal.endSwipe(pointerAt(100))

        expect(modal.displayType).toBe('lastTags')
    })

    it('ignores a canceled swipe', () => {
        const modal = createModal()

        modal.startSwipe(pointerAt(100))
        modal.cancelSwipe()
        modal.endSwipe(pointerAt(40))

        expect(modal.displayType).toBe('lastTags')
    })
})
