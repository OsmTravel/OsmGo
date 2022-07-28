// ORDER TAGS BY PRIMARYKEYS ( order than "primaryKeys": ["advertising","shop","healthcare" etc ]
// It's define the priority of tags detection

import path from 'path'
import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tagsAndPresets', 'tags.json')

const tagConfig = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'))
const tagsOsmgo = tagConfig.tags

// ORDER BY primaryKeys FIRST
const primaryKeys = tagConfig.primaryKeys
// console.log(primaryKeys);

let primaryKeysObject = {}
for (const pk of primaryKeys) {
    primaryKeysObject[pk] = []
}
// console.log(primaryKeysObject);

for (const tag of tagsOsmgo) {
    const tagPk = tag.id.split('/')[0]
    // console.log(tagPk);
    primaryKeysObject[tagPk].push(tag)
}

let tagsOrderedByPk = []
for (const pk of primaryKeys) {
    tagsOrderedByPk = [...tagsOrderedByPk, ...primaryKeysObject[pk]]
}
tagConfig.tags = tagsOrderedByPk

const compareById = <T>(a: { id: T }, b: { id: T }) => {
    // Use toUpperCase() to ignore character casing
    const idA = a.id
    const idB = b.id

    let comparison = 0
    if (idA > idB) {
        comparison = 1
    } else if (idA < idB) {
        comparison = -1
    }
    return comparison
}

// tagConfig.tags = tagConfig.tags.sort(compareById);

fs.writeFileSync(tagsOsmgoPath, stringify(tagConfig), 'utf8')
