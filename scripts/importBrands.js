const got = require('got')
const path = require('path')
const fs = require('fs-extra')
const stringify = require('json-stringify-pretty-compact')

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsConfigPath = path.join(assetsFolder, 'tagsAndPresets', 'tags.json')
const presetsPath = path.join(assetsFolder, 'tagsAndPresets', 'presets.json')

const tagsConfig = JSON.parse(fs.readFileSync(tagsConfigPath, 'utf8'))
const tags = tagsConfig.tags
const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8'))

const nsiPresetsUrl =
    'https://cdn.jsdelivr.net/npm/name-suggestion-index@6.0/dist/presets/nsi-id-presets.json'

const formatBrandsNS = (brandsData) => {
    let result = []
    brandsData.forEach((v) => {
        const lbl = brandsData.name
        const brand = brandsData.addTags.brand
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

const importBrandsToPresetsConfig = (presets, id, options) => {
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

    for (let tagConfig of tags) {
        const pkey = Object.keys(tagConfig.tags)[0]

        if (Object.keys(tagConfig.tags).length == 1 && tagConfig.tags[pkey]) {
            const value = tagConfig.tags[pkey]
            if (brandsData[`${pkey}/${value}`]) {
                const brandOptions = formatBrandsNS(
                    brandsData[`${pkey}/${value}`]
                )
                if (brandOptions.length == 0) continue
                const id = `${pkey}#${value}#brand`
                importBrandsToPresetsConfig(presets, id, brandOptions)

                tagConfig.presets = tagConfig.presets.filter(
                    (p) => !/brand/.test(p)
                )
                tagConfig.presets = [id, ...tagConfig.presets]
            }
        }
    }

    fs.writeFileSync(presetsPath, stringify(presets), 'utf8')
    fs.writeFileSync(tagsConfigPath, stringify(tagsConfig), 'utf8')
}
run()
