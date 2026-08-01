import path from 'node:path'
import fs from 'fs-extra'

interface LocationSet {
    include?: Array<unknown>
}

interface NameSuggestionPreset {
    name: string
    locationSet?: LocationSet
    tags: Record<string, string>
    addTags: Record<string, string>
}

const { buildIDPresets } = require('name-suggestion-index') as {
    buildIDPresets: (
        data: Record<string, unknown>,
        options: { sourcePresets: Record<string, unknown> }
    ) => { presets: Record<string, NameSuggestionPreset> }
}

export interface BrandOption extends NameSuggestionPreset {
    v: string
    lbl: { en: string }
    countryCodes?: Array<string>
}

const readNameSuggestionData = (): Record<string, unknown> => {
    const packageEntry = require.resolve('name-suggestion-index')
    const dataPath = path.resolve(
        path.dirname(packageEntry),
        '../json/nsi.min.json'
    )
    const data = fs.readJsonSync(dataPath).nsi

    return Object.fromEntries(
        Object.entries(data).filter(([presetPath]) =>
            presetPath.startsWith('brands/')
        )
    )
}

const getCountryCodes = (
    locationSet?: LocationSet
): Array<string> | undefined => {
    const countryCodes = locationSet?.include
        ?.filter((location): location is string => typeof location === 'string')
        .map((location) => location.match(/^([a-z]{2})(?:-|$)/)?.[1])
        .filter((countryCode): countryCode is string => Boolean(countryCode))

    return countryCodes?.length ? [...new Set(countryCodes)] : undefined
}

export const getBrandOptions = (): Record<string, Array<BrandOption>> => {
    const sourcePresets = require('@openstreetmap/id-tagging-schema/dist/presets.json')
    const { presets } = buildIDPresets(readNameSuggestionData(), {
        sourcePresets,
    })
    const brandOptions: Record<string, Array<BrandOption>> = {}

    for (const [presetId, preset] of Object.entries(presets)) {
        const separatorIndex = presetId.lastIndexOf('/')
        const parentId = presetId.slice(0, separatorIndex)
        const countryCodes = getCountryCodes(preset.locationSet)
        const option: BrandOption = {
            v: preset.addTags.brand,
            lbl: { en: preset.name },
            ...preset,
        }

        if (countryCodes) {
            option.countryCodes = countryCodes
        }

        brandOptions[parentId] ??= []
        brandOptions[parentId].push(option)
    }

    return brandOptions
}
