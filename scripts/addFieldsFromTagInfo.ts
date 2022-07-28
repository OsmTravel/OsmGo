/**
 * Update the file 'tagsAndPresets/presets.json' with possible values from taginfo
 *
 * 1. Read the list of OSM keys from file 'tagsAndPresets/presets.json'
 * 2. If the 'preset key' is of type "list/select", the script will call taginfo to get possible values
 * 3. Write the possible values in the same file 'tagsAndPresets/presets.json'
 */

import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'
import rp from 'request-promise'
import { tapPresetsPath } from './_paths'

const presetsOsmgo = JSON.parse(fs.readFileSync(tapPresetsPath, 'utf8'))

const getOptionsFromTagInfo = async (
    key: string,
    nb: number = 30
): Promise<Array<unknown>> => {
    const url = `https://taginfo.openstreetmap.org/api/4/key/values?key=${key}&rp=${nb}&sortname=count&sortorder=desc`

    const rep = await rp(url)
    // console.log
    const data = JSON.parse(rep).data
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

const run = async (): Promise<void> => {
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

    fs.writeFileSync(tapPresetsPath, stringify(presetsOsmgo), 'utf8')
}

run()
