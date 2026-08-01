import { ModalsContentPage } from './modal'

describe('ModalsContentPage multi-key fields', () => {
    const genderPreset = {
        type: 'select',
        iDtype: 'radio',
        keys: ['male', 'female', 'unisex'],
        options: [{ v: 'male' }, { v: 'female' }, { v: 'unisex' }],
    }
    const tagConfig = {
        id: 'amenity/toilets',
        tags: { amenity: 'toilets' },
        presets: ['gender'],
    }

    function createPage(tags): ModalsContentPage {
        const feature = {
            type: 'Feature',
            id: 'node/1',
            geometry: { type: 'Point', coordinates: [1, 2] },
            properties: {
                type: 'node',
                id: 1,
                tags,
                meta: { version: 1 },
            },
        }
        const params = {
            data: {
                data: feature,
                type: 'Update',
                origineData: 'data',
            },
        }
        const tagsService = {
            presets: { gender: genderPreset },
            tags: [],
            savedFields: {},
            findPkey: () => ({ key: 'amenity', value: 'toilets' }),
        }
        return new ModalsContentPage(
            {} as any,
            params as any,
            {} as any,
            {} as any,
            tagsService as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any
        )
    }

    it('creates an empty editable field without an undefined key', () => {
        const page = createPage({ amenity: 'toilets' })

        page.initComponent(tagConfig as any)

        const genderTag = page.tags.find((tag) => tag.preset === genderPreset)
        expect(genderTag).toEqual({
            key: '',
            value: '',
            preset: genderPreset,
        })
    })

    it('keeps an existing multi-key value and serializes valid tags only', () => {
        const page = createPage({
            amenity: 'toilets',
            unisex: 'yes',
        })
        page.initComponent(tagConfig as any)
        page.tags.push({ key: undefined, value: 'unisex' } as any)

        page.pushTagsToFeature()

        expect(page.feature.properties.tags).toEqual({
            amenity: 'toilets',
            unisex: 'yes',
        })
    })
})
