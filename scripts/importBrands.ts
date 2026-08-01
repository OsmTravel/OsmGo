import fs from 'fs-extra'
import stringify from 'json-stringify-pretty-compact'
import { tapPresetsPath, tapTagsPath } from './_paths'
import { readTapPresetsFromJson, readTapTagsFromJson } from './_utils'
import { type BrandOption, getBrandOptions } from './nameSuggestionIndex'

const tagsConfig = readTapTagsFromJson()
const tags = tagsConfig.tags
const presets = readTapPresetsFromJson()

const addBrandPreset = (
    presets: any,
    id: string,
    options: Array<BrandOption>
): void => {
    const compactOptions = options.map(
        ({ v, lbl, countryCodes, tags, addTags }) => {
            return {
                v,
                lbl,
                ...(countryCodes ? { countryCodes } : {}),
                tags,
                addTags,
            }
        }
    )

    presets[id] = {
        key: 'brand',
        type: 'list',
        lbl: { en: 'Brand', fr: 'Enseigne' },
        options: compactOptions,
    }
}

const run = () => {
    const brandsData = getBrandOptions()

    for (const presetId of Object.keys(presets)) {
        if (presetId.endsWith('#brand')) {
            delete presets[presetId]
        }
    }

    for (const tagConfig of tags) {
        tagConfig.presets = tagConfig.presets.filter(
            (presetId) => !presetId.endsWith('#brand')
        )
    }

    for (const tagConfig of tags) {
        const pkey = Object.keys(tagConfig.tags)[0]

        if (Object.keys(tagConfig.tags).length === 1 && tagConfig.tags[pkey]) {
            const value = tagConfig.tags[pkey]
            if (brandsData[`${pkey}/${value}`]) {
                const brandOptions = brandsData[`${pkey}/${value}`]
                const id = `${pkey}#${value}#brand`
                addBrandPreset(presets, id, brandOptions)

                tagConfig.presets = [id, ...tagConfig.presets]
            }
        }
    }

    fs.writeFileSync(tapPresetsPath, stringify(presets), 'utf8')
    fs.writeFileSync(tapTagsPath, stringify(tagsConfig), 'utf8')
}
run()
