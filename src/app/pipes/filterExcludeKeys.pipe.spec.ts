import type { Tag, TagConfig } from '@osmgo/type'
import { FilterExcludeKeysPipe } from './filterExcludeKeys.pipe'

describe('FilterExcludeKeysPipe', () => {
    it('excludes preset keys that are not available in the current country', () => {
        const pipe = new FilterExcludeKeysPipe()
        const tags: Tag[] = [
            { key: 'name', value: 'Bench' },
            { key: 'access', value: 'yes' },
            { key: 'surface', value: 'wood' },
        ]
        const tagConfig: TagConfig = {
            id: 'amenity/bench',
            icon: 'bench',
            markerColor: '#000000',
            presets: ['access'],
            geometry: ['point'],
            tags: { amenity: 'bench' },
        }
        const presets = {
            access: {
                _id: 'access',
                type: 'select',
                lbl: { en: 'Access' },
                key: 'access',
                countryCode: ['FR'],
            },
        }

        expect(pipe.transform(tags, tagConfig, 'US', [], presets)).toEqual([
            { key: 'surface', value: 'wood' },
        ])
    })
})
