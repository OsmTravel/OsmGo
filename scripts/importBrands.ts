import path from 'path'
import fs from 'fs-extra'
import stringify from 'json-stringify-pretty-compact'
import { brandsPath, presetsOsmgoPath, tagsOsmgoPath } from './_paths'

const tagsConfig = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'))
const tags = tagsConfig.tags
const presets = JSON.parse(fs.readFileSync(presetsOsmgoPath, 'utf8'))

const formatBrandsNS = (brandsNSJson): Array<unknown> => {
    let result = []
    for (let k in brandsNSJson) {
        const lbl = k.split('|')[1]
        const v = brandsNSJson[k]['tags']['brand']
        const newObWithLbl = {
            v: v,
            lbl: { en: lbl },
            ...brandsNSJson[k],
        }
        result = [...result, newObWithLbl]
        // console.log(newObWithLbl);
    }
    return result
}

const importBrandsToPresetsConfig = (
    presets: any,
    id: string,
    options: any
): any => {
    // amenity#fast_food#brand
    const keep = ['v', 'lbl', 'countryCodes', 'tags']

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

for (const tagConfig of tags) {
    const pkey = Object.keys(tagConfig.tags)[0]

    if (Object.keys(tagConfig.tags).length == 1 && tagConfig.tags[pkey]) {
        const value = tagConfig.tags[pkey]
        const currentBrandPath = path.join(brandsPath, pkey, `${value}.json`)
        if (fs.existsSync(currentBrandPath)) {
            const brandNS = JSON.parse(
                fs.readFileSync(currentBrandPath, 'utf8')
            )
            const brandOptions = formatBrandsNS(brandNS)
            const id = `${pkey}#${value}#brand`
            importBrandsToPresetsConfig(presets, id, brandOptions)

            tagConfig.presets = tagConfig.presets.filter(
                (p) => !/brand/.test(p)
            )
            tagConfig.presets = [id, ...tagConfig.presets]
        }
    }
}

fs.writeFileSync(presetsOsmgoPath, stringify(presets), 'utf8')
fs.writeFileSync(tagsOsmgoPath, stringify(tagsConfig), 'utf8')
