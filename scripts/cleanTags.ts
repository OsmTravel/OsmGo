import fs from 'fs-extra'
import stringify from 'json-stringify-pretty-compact'
import { tagsOsmgoPath, presetsOsmgoPath } from './_paths'

const tagsConfig = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'))
const presetsOsmgo = fs.readJSONSync(presetsOsmgoPath)

const uniqIds = []
const indexToDelete = []

for (let i = 0; i < tagsConfig.tags.length; i++) {
    const tag = tagsConfig.tags[i]

    if (tag.id) {
        if (!uniqIds.includes(tag.id)) {
            uniqIds.push(tag.id)
        } else {
            console.log('DOUBLON', tag.id)
            // console.log(i);
            indexToDelete.push(i)
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

for (let i = indexToDelete.length - 1; i >= 0; i--) {
    tagsConfig.tags.splice(indexToDelete[i], 1)
}

console.log(indexToDelete)

fs.writeFileSync(tagsOsmgoPath, stringify(tagsConfig))

for (let pid in presetsOsmgo) {
    const preset = presetsOsmgo[pid]
    if (['select', 'list'].includes(preset.type)) {
        if (!preset.options || preset.options.length < 2) {
            delete presetsOsmgo[pid]
        }
    }
}
fs.writeFileSync(presetsOsmgoPath, stringify(presetsOsmgo))
