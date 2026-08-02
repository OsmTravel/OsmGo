import type { PresetOption, TagConfig } from '@osmgo/type'

import { FilterByPresetsContentPipe } from './filterByPresetsContent.pipe'
import { FilterByTagsContentPipe } from './filterByTagsContent.pipe'

describe('literal search pipes', () => {
    const presetOptions: PresetOption[] = [
        {
            v: 'covered[value]',
            lbl: { en: 'Café terrace' },
            terms: { en: ['night   club'] },
        },
        { v: 'plain', lbl: { en: 'Plain value' } },
    ]
    const tagConfigs: TagConfig[] = [
        {
            id: 'amenity-cafe',
            icon: '',
            markerColor: '',
            presets: [],
            geometry: ['point'],
            tags: { amenity: 'cafe', note: 'covered[value]' },
            lbl: { en: 'Café terrace' },
            terms: { en: ['night   club'] },
        },
        {
            id: 'plain',
            icon: '',
            markerColor: '',
            presets: [],
            geometry: ['point'],
            tags: { amenity: 'bench' },
            lbl: { en: 'Plain value' },
        },
    ]

    it.each(['[', 'cafe', 'night club'])(
        'filters preset options with the literal query %s',
        (query) => {
            expect(
                new FilterByPresetsContentPipe().transform(
                    presetOptions,
                    ['en'],
                    query
                )
            ).toEqual([presetOptions[0]])
        }
    )

    it.each(['[', 'cafe', 'night club'])(
        'filters tag configurations with the literal query %s',
        (query) => {
            expect(
                new FilterByTagsContentPipe().transform(
                    tagConfigs,
                    ['en'],
                    query
                )
            ).toEqual([tagConfigs[0]])
        }
    )

    it('returns all values for empty search text', () => {
        expect(
            new FilterByPresetsContentPipe().transform(
                presetOptions,
                ['en'],
                '   '
            )
        ).toBe(presetOptions)
        expect(
            new FilterByTagsContentPipe().transform(tagConfigs, ['en'], '')
        ).toBe(tagConfigs)
    })
})
