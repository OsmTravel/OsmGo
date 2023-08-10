import fs from 'fs-extra'
import stringify from 'json-stringify-pretty-compact'
import { tapTagsPath, tapPresetsPath } from './_paths'
import { readTapPresetsFromJson, readTapTagsFromJson } from './_utils'

const tagsConfig = readTapTagsFromJson()
const presetsOsmgo = readTapPresetsFromJson()

const uniqIds: string[] = []
const indicesToDelete: number[] = []

for (let i = 0; i < tagsConfig.tags.length; i++) {
    const tag = tagsConfig.tags[i]

    if (tag.id) {
        if (!uniqIds.includes(tag.id)) {
            uniqIds.push(tag.id)
        } else {
            console.log(`Duplicate tag id : ${tag.id} => deletion`)
            indicesToDelete.push(i)
        }
    } else {
        console.error(`No id for tag ${i}`)
    }

    // delete "key" property
    if (tag.key) {
        console.log(`Deprecated key property for tag ${tag.id}`)
        delete tag.key
    }

    for (let pid of tag.presets) {
        if (!presetsOsmgo[pid]) {
            console.error(`Preset ${pid} not found for tag ${tag.id}`)
        }
    }

    if (tag.icon === undefined) {
        console.error(`No icon for tag ${tag.id}`)
        tag.icon = ''
    }

    if (!tag.tags) {
        console.error(`No tags for tag ${tag.id} !!`)
    }

    // tag.presets = tag.presets.filter((p: string) => p !== 'name')
}

for (let i = indicesToDelete.length - 1; i >= 0; i--) {
    tagsConfig.tags.splice(indicesToDelete[i], 1)
}

console.log(indicesToDelete)

fs.writeFileSync(tapTagsPath, stringify(tagsConfig))

// Delete unused presets
let usedPresetIdsFromTags: string[] = []
for (let tag of tagsConfig.tags) {
    usedPresetIdsFromTags = [
        ...usedPresetIdsFromTags,
        ...tag.presets,
        ...(tag.moreFields || []),
    ]
}

for (let pid in presetsOsmgo) {
    if (!usedPresetIdsFromTags.includes(pid)) {
        console.log(`Preset ${pid} not used => deletion`)
        delete presetsOsmgo[pid]
    }
}

// for (let pid in presetsOsmgo) {
//     const preset = presetsOsmgo[pid]
//     if (['select', 'list'].includes(preset.type)) {
//         if (!preset.options || preset.options.length < 2) {
//             console.log(`Options Preset ${pid} has no options => deletion`)
//             delete presetsOsmgo[pid]
//         }
//     }
// }
fs.writeFileSync(tapPresetsPath, stringify(presetsOsmgo))
