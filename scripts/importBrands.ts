import path from 'path'
import fs from 'fs-extra'
import stringify from 'json-stringify-pretty-compact'
import got from 'got'
import { tapPresetsPath, tapTagsPath } from './_paths'
import { readTapPresetsFromJson, readTapTagsFromJson } from './_utils'

const nsiPresetsUrl =
    'https://cdn.jsdelivr.net/npm/name-suggestion-index@6.0/dist/presets/nsi-id-presets.json'

const tagsConfig = readTapTagsFromJson()
const tags = tagsConfig.tags
const presets = readTapPresetsFromJson()

const formatBrandsNS = (brandsData: Array<any>): Array<unknown> => {
    let result = []
    brandsData.forEach((v) => {
        const lbl = v.name
        const brand = v.addTags.brand
        const newObWithLbl = {
            v: brand,
            lbl: { en: lbl },
            ...v,
        }
        result.push(newObWithLbl)
        // console.log(newObWithLbl);
    })
    return result
}

const importBrandsToPresetsConfig = (
    presets: any,
    id: string,
    options: any
): any => {
    // amenity#fast_food#brand
    const keep = ['v', 'lbl', 'countryCodes', 'tags', 'addTags']

    options = options.map((o) => {
        for (let k in o) {
            if (!keep.includes(k)) {
                delete o[k]
            }
        }
        return o
    })

    const presetContent = {
        key: 'brand',
        type: 'list',
        lbl: { en: 'Brand', fr: 'Enseigne' },
        options: options,
    }

    presets[id] = presetContent
    return presets // it's mutable...
}

const parseNsiPresets = (data) => {
    let result = {}
    for (let k in data.presets) {
        let k_parts = k.split('/')
        const id = k_parts.pop()
        const pkey = k_parts.join('/')
        if (!result[pkey]) result[pkey] = []
        data.presets[k].id = id
        result[pkey].push(data.presets[k])
    }
    return result
}

const run = async () => {
    const brandsDataRaw = await got(nsiPresetsUrl).json()
    const brandsData = parseNsiPresets(brandsDataRaw)

    for (const tagConfig of tags) {
        const pkey = Object.keys(tagConfig.tags)[0]

        if (Object.keys(tagConfig.tags).length == 1 && tagConfig.tags[pkey]) {
            const value = tagConfig.tags[pkey]
            if (brandsData[`${pkey}/${value}`]) {
                const brandOptions = formatBrandsNS(
                    brandsData[`${pkey}/${value}`]
                )
                const id = `${pkey}#${value}#brand`
                importBrandsToPresetsConfig(presets, id, brandOptions)

                tagConfig.presets = tagConfig.presets.filter(
                    (p) => !/brand/.test(p)
                )
                tagConfig.presets = [id, ...tagConfig.presets]
            }
        }
    }

    fs.writeFileSync(tapPresetsPath, stringify(presets), 'utf8')
    fs.writeFileSync(tapTagsPath, stringify(tagsConfig), 'utf8')
}
run()
