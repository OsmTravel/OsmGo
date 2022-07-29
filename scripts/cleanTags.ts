import { TapPresetsJson, TapTagsJson } from '@osmgo/type'
import fs from 'fs-extra'
import stringify from 'json-stringify-pretty-compact'
import { tapTagsPath, tapPresetsPath } from './_paths'

const tagsConfig: TapTagsJson = JSON.parse(fs.readFileSync(tapTagsPath, 'utf8'))
const presetsOsmgo: TapPresetsJson = fs.readJSONSync(tapPresetsPath)

const uniqIds: string[] = []
const indicesToDelete: number[] = []

for (let i = 0; i < tagsConfig.tags.length; i++) {
    const tag = tagsConfig.tags[i]

    if (tag.id) {
        if (!uniqIds.includes(tag.id)) {
            uniqIds.push(tag.id)
        } else {
            console.log('DOUBLON', tag.id)
            // console.log(i);
            indicesToDelete.push(i)
        }
    } else {
        if (tag.iDRef) {
            tag.id = tag.iDRef
        } else {
            console.log("PAS D'ID ", tag)
        }
    }

    // delete "key" property
    if (tag.key) {
        delete tag.key
    }

    for (let pid of tag.presets) {
        if (!presetsOsmgo[pid]) {
            tag.presets = tag.presets.filter((e) => e !== pid)
        }
    }

    if (tag.icon === undefined) {
        tag.icon = ''
        // console.log( tag.icon)
    }

    if (!tag.tags) {
        tag['tags'] = {}
        // tag['tags'][pkey] = tag.key   // TODO @dotcs: This line throws an error because pkey is not defined
    }

    tag.presets = tag.presets.filter((p: string) => p !== 'name')

    if (!tag.id) {
        if (tag['iDRef']) {
            tag['id'] = tag['iDRef']
        } else {
            const newId = Object.keys(tag.tags)
                .map((k) => `${k}/${tag.tags[k]}`)
                .join('#')
            console.log(newId)
            tag['id'] = newId
        }
        // console.log(tag)
    }
}

for (let i = indicesToDelete.length - 1; i >= 0; i--) {
    tagsConfig.tags.splice(indicesToDelete[i], 1)
}

console.log(indicesToDelete)

fs.writeFileSync(tapTagsPath, stringify(tagsConfig))

for (let pid in presetsOsmgo) {
    const preset = presetsOsmgo[pid]
    if (['select', 'list'].includes(preset.type)) {
        if (!preset.options || preset.options.length < 2) {
            delete presetsOsmgo[pid]
        }
    }
}
fs.writeFileSync(tapPresetsPath, stringify(presetsOsmgo))
