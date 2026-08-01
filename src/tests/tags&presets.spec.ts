interface TagConfig {
    id: string
    tags: Record<string, string>
    presets: Array<string>
    moreFields?: Array<string>
    lbl?: Record<string, string>
    geometry?: Array<string>
}

interface PresetOption {
    v: string
    lbl?: Record<string, string>
}

interface Preset {
    key?: string
    keys?: Array<string>
    type: string
    lbl?: Record<string, string>
    options?: Array<PresetOption>
}

const tagsConfig = require('../assets/tagsAndPresets/tags.json') as {
    primaryKeys: Array<string>
    tags: Array<TagConfig>
}
const presets = require('../assets/tagsAndPresets/presets.json') as Record<
    string,
    Preset
>

const presetTypes = [
    'select',
    'list',
    'number',
    'text',
    'tel',
    'url',
    'email',
    'opening_hours',
]
const geometryTypes = ['point', 'vertex', 'line', 'area', 'relation']

describe('generated tags and presets', () => {
    it('keeps the expected primary tag groups', () => {
        expect(tagsConfig.primaryKeys).toEqual(
            expect.arrayContaining([
                'shop',
                'advertising',
                'amenity',
                'leisure',
                'man_made',
            ])
        )
    })

    it('uses unique tag IDs', () => {
        const tagIds = tagsConfig.tags.map((tag) => tag.id)

        expect(new Set(tagIds).size).toBe(tagIds.length)
    })

    it('uses unique tag combinations', () => {
        const tagCombinations = tagsConfig.tags.map((tag) =>
            Object.entries(tag.tags)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, value]) => `${key}=${value}`)
                .join('&')
        )

        expect(new Set(tagCombinations).size).toBe(tagCombinations.length)
    })

    it('uses declared primary keys', () => {
        for (const tag of tagsConfig.tags) {
            const entries = Object.entries(tag.tags)

            expect(tag.id).toBeTruthy()
            expect(entries.length).toBeGreaterThan(0)
            expect(
                entries.some(([key]) => tagsConfig.primaryKeys.includes(key))
            ).toBe(true)
        }
    })

    it('does not generate undefined keys or values', () => {
        for (const tag of tagsConfig.tags) {
            const entries = Object.entries(tag.tags)
            for (const [key, value] of entries) {
                expect(key).not.toBe('undefined')
                expect(value).not.toBe('undefined')
            }
        }

        for (const preset of Object.values(presets)) {
            expect(preset.key).not.toBe('undefined')
            expect(preset.keys || []).not.toContain('undefined')
            for (const option of preset.options || []) {
                expect(option.v).not.toBe('undefined')
            }
        }
    })

    it('only references existing presets', () => {
        const missingPresetIds: Array<string> = []

        for (const tag of tagsConfig.tags) {
            for (const presetId of [
                ...tag.presets,
                ...(tag.moreFields || []),
            ]) {
                if (!presets[presetId]) {
                    missingPresetIds.push(`${tag.id}: ${presetId}`)
                }
            }
        }

        expect(missingPresetIds).toEqual([])
    })

    it('does not duplicate colon or underscore preset IDs', () => {
        const normalizedIds = Object.keys(presets).map((presetId) =>
            presetId.replaceAll(':', '/').replaceAll('_', '/')
        )

        expect(new Set(normalizedIds).size).toBe(normalizedIds.length)
    })

    it('keeps compound fields and the toilets field from iD', () => {
        const caravanSite = tagsConfig.tags.find(
            (tag) => tag.id === 'tourism/caravan_site'
        )

        expect(caravanSite?.presets).toContain('toilets')
        expect(presets.toilets.key).toBe('toilets')
        expect(presets.gender.keys).toEqual(['male', 'female', 'unisex'])
    })

    it('uses supported geometries', () => {
        for (const tag of tagsConfig.tags) {
            const geometries = tag.geometry || []

            expect(geometries.length).toBeGreaterThan(0)
            expect(
                geometries.every((geometry) => geometryTypes.includes(geometry))
            ).toBe(true)
        }
    })

    it('provides English labels', () => {
        for (const tag of tagsConfig.tags) {
            expect(tag.lbl?.en).toBeTruthy()
        }

        for (const preset of Object.values(presets)) {
            expect(preset.lbl?.en).toBeTruthy()
            for (const option of preset.options || []) {
                expect(option.lbl?.en).toBeTruthy()
            }
        }
    })

    it('uses supported preset types', () => {
        for (const preset of Object.values(presets)) {
            expect(presetTypes).toContain(preset.type)
        }
    })

    it('provides options for selections', () => {
        for (const preset of Object.values(presets)) {
            if (['select', 'list'].includes(preset.type)) {
                expect(preset.options?.length).toBeGreaterThan(0)
            }
        }
    })
})
