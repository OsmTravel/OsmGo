import { TestBed } from '@angular/core/testing'
import { MatDialogRef } from '@angular/material/dialog'
import { ConfigService } from '@services/config.service'
import { CustomTagError, TagsService } from '@services/tags.service'
import { ModalPrimaryTag } from './modal.primaryTag'

describe('ModalPrimaryTag', () => {
    const addCustomTag = vi.fn()
    const pointerAt = (clientX: number): PointerEvent =>
        ({ clientX }) as PointerEvent

    const createModal = (): ModalPrimaryTag =>
        TestBed.runInInjectionContext(() => new ModalPrimaryTag())

    beforeEach(() => {
        addCustomTag.mockReset()
        TestBed.configureTestingModule({
            providers: [
                { provide: MatDialogRef, useValue: {} },
                { provide: TagsService, useValue: { addCustomTag } },
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

    it('submits the validated custom tag returned by TagsService', () => {
        const modal = createModal()
        const tag = { id: 'cuisine/pizza' }
        addCustomTag.mockReturnValue(tag)
        vi.spyOn(modal, 'summit').mockReturnValue(undefined)

        modal.addCustomValue('cuisine', 'pizza')

        expect(addCustomTag).toHaveBeenCalledWith('cuisine', 'pizza')
        expect(modal.summit).toHaveBeenCalledWith(tag)
        expect(modal.customValueError()).toBeNull()
    })

    it('exposes a catalog collision without closing the selector', () => {
        const modal = createModal()
        addCustomTag.mockImplementation(() => {
            throw new CustomTagError('collision')
        })
        vi.spyOn(modal, 'summit').mockReturnValue(undefined)

        modal.addCustomValue('amenity', 'cafe')

        expect(modal.summit).not.toHaveBeenCalled()
        expect(modal.customValueError()).toBe(
            'MODAL_SELECTED_ITEM.CUSTOM_TAG_COLLISION'
        )
    })
})
