/**
 * Update the file 'tagsAndPresets/presets.json' with possible values from taginfo
 *
 * 1. Read the list of OSM keys from file 'tagsAndPresets/presets.json'
 * 2. If the 'preset key' is of type "list/select", the script will call taginfo to get possible values
 * 3. Write the possible values in the same file 'tagsAndPresets/presets.json'
 */

const path = require('path')
const fs = require('fs')
const stringify = require('json-stringify-pretty-compact')
const got = require('got')

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tagsAndPresets', 'tags.json')
const presetsOsmgoPath = path.join(
    assetsFolder,
    'tagsAndPresets',
    'presets.json'
)

const tagsOsmgo = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'))
const presetsOsmgo = JSON.parse(fs.readFileSync(presetsOsmgoPath, 'utf8'))

const getOptionsFromTagInfo = async (key, nb = 30) => {
    const url = `https://taginfo.openstreetmap.org/api/4/key/values?key=${key}&rp=${nb}&sortname=count&sortorder=desc`

    const data = (await got(url).json()).data
    if (!data) {
        return null
    }
    // console.log(data);
    let options = []

    for (let d of data) {
        if (!/;/.test(d.value)) {
            let opt = { v: d.value, lbl: { en: d.value } }
            options.push(opt)
        }
    }

    return options
}

const run = async () => {
    for (let k in presetsOsmgo) {
        const currentPreset = presetsOsmgo[k]
        if (['list', 'select'].includes(currentPreset.type)) {
            if (!currentPreset.options && !currentPreset.optionsFromJson) {
                // console.log(currentPreset.key)
                let options = await getOptionsFromTagInfo(currentPreset.key)
                if (options) {
                    currentPreset['options'] = options.slice(0, 30)
                    console.log(currentPreset['options'])
                }

                // console.log(currentPreset);
            }
        }
    }

    fs.writeFileSync(presetsOsmgoPath, stringify(presetsOsmgo), 'utf8')
}

run()
