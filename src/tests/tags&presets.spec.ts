const tagsConfig: any = require('../assets/tagsAndPresets/tags.json')
const presets: any = require('../assets/tagsAndPresets/presets.json')
describe('tagsAndPresets', () => {
    beforeEach(() => {})

    it('tags should contain shop/amenity/etc..', () => {
        const pkeys = tagsConfig.primaryKeys
        expect(pkeys).toContain('shop')
        expect(pkeys).toContain('advertising')
        expect(pkeys).toContain('amenity')
        expect(pkeys).toContain('leisure')
        expect(pkeys).toContain('man_made')
    })

    it('tags should have an ID', () => {
        for (let tag of tagsConfig.tags) {
            const id = tag.id
            expect(id).toBeTruthy(id)
        }
    })

    it('tags should have a "tags" property', () => {
        const withoutTags = []
        for (let tag of tagsConfig.tags) {
            if (!tag.tags || Object.keys(tag.tags).length === 0) {
                withoutTags.push(tag.id)
            }
        }
        expect(withoutTags).toEqual([])
    })

    it('tags should have a primary key tag', () => {
        const idWithoutPrimarykey = []
        const pkeys = tagsConfig.primaryKeys
        for (let tag of tagsConfig.tags) {
            const keysTag = Object.keys(tag.tags)
            // intersection of keysTag and pkeys
            const intersection = keysTag.filter((x) => pkeys.includes(x))
            if (intersection.length === 0) {
                idWithoutPrimarykey.push(tag.id)
            }
        }
        expect(idWithoutPrimarykey).toEqual([])
    })

    it('tags should not have same "tags"', () => {
        const uniqueTags = []
        const duplicateTags = []

        const tags = tagsConfig.tags
        for (let tag of tags) {
            let tagsStrs = []
            for (let t in tag.tags) {
                tagsStrs.push(`${t}:${tag.tags[t]}`)
            }
            let ts = tagsStrs.sort().join(',')
            if (!uniqueTags.includes(ts)) {
                uniqueTags.push(ts)
            } else {
                duplicateTags.push(`${tag.id} : ${JSON.stringify(ts)}`)
            }
        }

        expect(duplicateTags).toEqual([])
    })

    it('tags should have an unique ID', () => {
        const ids = []
        const duplicateIds = []
        const tags = tagsConfig.tags
        for (let tag of tags) {
            const id = tag.id
            if (!ids.includes(id)) {
                ids.push(id)
            } else {
                duplicateIds.push(id)
            }
        }
        expect(duplicateIds).toEqual([])
    })

    it('tags should use existing presets id', () => {
        const unknowPresetId = []

        const tags = tagsConfig.tags
        for (let tag of tags) {
            const currentTagsPresets = [
                ...tag.presets,
                ...(tag.moreFields || []),
            ]
            for (let pid of currentTagsPresets) {
                if (!presets[pid]) {
                    unknowPresetId.push(`${tag.id} : ${pid}`)
                }
            }
        }

        expect(unknowPresetId).toEqual([])
    })

    it('tags should have english label', () => {
        const noEn = []
        const tags = tagsConfig.tags
        for (let tag of tags) {
            if (!tag.lbl || !tag.lbl.en) {
                noEn.push(tag.id)
            }
        }

        expect(noEn).toEqual([], noEn)
    })

    it('tags should have "geometry" property ([\'point\',etc} ', () => {
        const nogeom = []

        const tags = tagsConfig.tags
        for (let tag of tags) {
            if (!tag.geometry || tag.geometry.length < 1) {
                nogeom.push(tag.id)
            }
        }

        expect(nogeom).toEqual([])
    })

    it('type of presets should be  list / select / number / text / tel / url / email / opening_hours', () => {
        const noOptionsTags = []

        for (let pid in presets) {
            const preset = presets[pid]
            if (
                ![
                    'select',
                    'list',
                    'number',
                    'text',
                    'tel',
                    'url',
                    'email',
                    'opening_hours',
                ].includes(preset.type)
            ) {
                noOptionsTags.push(pid)
            }
        }
        expect(noOptionsTags).toEqual([])
    })

    it('presets with type "list" or "select" should have options', () => {
        const noOptionsTags = []

        for (let pid in presets) {
            const preset = presets[pid]
            if (['select', 'list'].includes(preset.type)) {
                if (!preset.options || preset.options.length < 1) {
                    noOptionsTags.push(pid)
                }
            }
        }
        expect(noOptionsTags).toEqual([])
    })
})
