import { TestBed } from '@angular/core/testing'
import { MenuPage } from './menu'

describe('MenuPage swipes', () => {
    const pointerAt = (clientX: number): PointerEvent =>
        ({ clientX }) as PointerEvent

    const createPage = (): MenuPage =>
        TestBed.runInInjectionContext(
            () =>
                new MenuPage(
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
                )
        )

    it('closes the menu after a left swipe', () => {
        const page = createPage()
        vi.spyOn(page, 'closeMenu').mockReturnValue(undefined)

        page.startSwipe(pointerAt(100))
        page.endSwipe(pointerAt(40))

        expect(page.closeMenu).toHaveBeenCalled()
    })

    it('ignores a canceled swipe', () => {
        const page = createPage()
        vi.spyOn(page, 'closeMenu').mockReturnValue(undefined)

        page.startSwipe(pointerAt(100))
        page.cancelSwipe()
        page.endSwipe(pointerAt(40))

        expect(page.closeMenu).not.toHaveBeenCalled()
    })
})
