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

const intersectRecords = (
    records: Array<Record<string, string>>
): Record<string, string> => {
    const [first = {}, ...rest] = records
    return Object.fromEntries(
        Object.entries(first).filter(([key, value]) =>
            rest.every((record) => record[key] === value)
        )
    )
}

/**
 * The NSI can contain distinct regional entities with the same OSM brand
 * value. OsmGo stores that value as the option identity, so keeping several
 * entries would make selection order-dependent. Merge them conservatively:
 * countries are combined and conflicting extra tags are omitted.
 */
export const mergeBrandOptionsByValue = (
    options: Array<BrandOption>
): Array<BrandOption> => {
    const grouped = new Map<string, BrandOption[]>()
    for (const option of options) {
        grouped.set(option.v, [...(grouped.get(option.v) ?? []), option])
    }
    return [...grouped.entries()].map(([value, candidates]) => {
        const canonical = [...candidates].sort((left, right) => {
            const leftLabel = left.lbl.en
            const rightLabel = right.lbl.en
            return (
                leftLabel.length - rightLabel.length ||
                leftLabel.localeCompare(rightLabel)
            )
        })[0]
        const isGlobal = candidates.some((candidate) => !candidate.countryCodes)
        const countryCodes = isGlobal
            ? undefined
            : [
                  ...new Set(
                      candidates.flatMap(
                          (candidate) => candidate.countryCodes ?? []
                      )
                  ),
              ].sort()

        return {
            ...canonical,
            v: value,
            tags: intersectRecords(
                candidates.map((candidate) => candidate.tags)
            ),
            addTags: intersectRecords(
                candidates.map((candidate) => candidate.addTags)
            ),
            ...(countryCodes ? { countryCodes } : {}),
        }
    })
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

    return Object.fromEntries(
        Object.entries(brandOptions).map(([presetId, options]) => [
            presetId,
            mergeBrandOptionsByValue(options),
        ])
    )
}
