import { TestBed } from '@angular/core/testing'
import type { Tag } from '@osmgo/type'
import { SelectComponent } from './select.component'

describe('SelectComponent', () => {
    const genderPreset = {
        type: 'select',
        iDtype: 'radio',
        keys: ['male', 'female', 'unisex'],
        options: [{ v: 'male' }, { v: 'female' }, { v: 'unisex' }],
    }

    function createComponent(tag: Tag): SelectComponent {
        const fixture = TestBed.createComponent(SelectComponent)
        fixture.componentRef.setInput('preset', genderPreset)
        fixture.componentRef.setInput('tag', tag)
        const component = fixture.componentInstance
        return component
    }

    it('selects a real OSM key for a multi-key field', () => {
        const tag = { key: '', value: '' }
        const component = createComponent(tag)

        component.selectChange('unisex')

        expect(tag).toEqual({ key: 'unisex', value: 'yes' })
        expect(component.selectedValue).toBe('unisex')
    })

    it('replaces the previous key when the selection changes', () => {
        const tag = { key: 'unisex', value: 'yes' }
        const component = createComponent(tag)

        component.selectChange('male')

        expect(tag).toEqual({ key: 'male', value: 'yes' })
    })

    it('clears the current tag when the empty option is selected', () => {
        const tag = { key: 'unisex', value: 'yes' }
        const component = createComponent(tag)

        component.selectChange('')

        expect(tag).toEqual({ key: '', value: '' })
    })
})
