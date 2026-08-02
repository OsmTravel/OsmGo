import { TestBed } from '@angular/core/testing'
import { MatDialogRef } from '@angular/material/dialog'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'
import { ModalPrimaryTag } from './modal.primaryTag'

describe('ModalPrimaryTag', () => {
    const pointerAt = (clientX: number): PointerEvent =>
        ({ clientX }) as PointerEvent

    const createModal = (): ModalPrimaryTag =>
        TestBed.runInInjectionContext(() => new ModalPrimaryTag())

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                { provide: MatDialogRef, useValue: {} },
                { provide: TagsService, useValue: {} },
                { provide: ConfigService, useValue: {} },
            ],
        })
    })

    it('updates the search signal from a native input value', () => {
        const modal = createModal()

        modal.onSearchInput('cafe')

        expect(modal.searchText()).toBe('cafe')

        modal.onSearchInput('')

        expect(modal.searchText()).toBe('')
    })

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
