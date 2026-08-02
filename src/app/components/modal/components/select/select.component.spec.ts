import { TestBed } from '@angular/core/testing'
import { SelectComponent } from './select.component'

describe('SelectComponent', () => {
    const genderPreset = {
        type: 'select',
        iDtype: 'radio',
        keys: ['male', 'female', 'unisex'],
        options: [{ v: 'male' }, { v: 'female' }, { v: 'unisex' }],
    }

    function createComponent(tag) {
        const component = TestBed.runInInjectionContext(
            () => new SelectComponent()
        )
        component.preset = genderPreset
        component.tag = tag
        return component
    }

    it('selects a real OSM key for a multi-key field', () => {
        const tag = { key: '', value: '' }
        const component = createComponent(tag)

        component.selectChange({ detail: { value: 'unisex' } })

        expect(tag).toEqual({ key: 'unisex', value: 'yes' })
        expect(component.selectedValue).toBe('unisex')
    })

    it('replaces the previous key when the selection changes', () => {
        const tag = { key: 'unisex', value: 'yes' }
        const component = createComponent(tag)

        component.selectChange({ detail: { value: 'male' } })

        expect(tag).toEqual({ key: 'male', value: 'yes' })
    })

    it('keeps the current tag when selection is cancelled', () => {
        const tag = { key: 'unisex', value: 'yes' }
        const component = createComponent(tag)

        component.selectChange(undefined)

        expect(tag).toEqual({ key: 'unisex', value: 'yes' })
    })
})
