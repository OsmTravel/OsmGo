import { TestBed } from '@angular/core/testing'
import { EditPresets } from './Presets.component'

describe('EditPresets', () => {
    it('uses the select editor for a multi-key preset without a primary key', () => {
        const component = TestBed.runInInjectionContext(() => new EditPresets())
        component.preset = {
            type: 'text',
            iDtype: 'manyCombo',
            keys: ['male', 'female', 'unisex'],
            options: [{ v: 'male' }, { v: 'female' }, { v: 'unisex' }],
        }

        expect(component.isMultiKeyPreset).toBe(true)
    })

    it('keeps the normal editor for a field with one primary key', () => {
        const component = TestBed.runInInjectionContext(() => new EditPresets())
        component.preset = {
            key: 'phone',
            keys: ['phone', 'contact:phone'],
            type: 'tel',
        }

        expect(component.isMultiKeyPreset).toBe(false)
    })
})
