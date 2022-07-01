// ORDER TAGS BY PRIMARYKEYS ( order than "primaryKeys": ["advertising","shop","healthcare" etc ]
// It's define the priority of tags detection

const path = require('path')
const fs = require('fs')
const stringify = require('json-stringify-pretty-compact')

const _ = require('lodash')

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tagsAndPresets', 'tags.json')

const tagConfig = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'))
const tagsOsmgo = tagConfig.tags

// ORDER BY primaryKeys FIRST
const primaryKeys = tagConfig.primaryKeys
// console.log(primaryKeys);

let primaryKeysObject = {}
for (pk of primaryKeys) {
    primaryKeysObject[pk] = []
}
// console.log(primaryKeysObject);

for (let tag of tagsOsmgo) {
    const tagPk = tag.id.split('/')[0]
    // console.log(tagPk);
    primaryKeysObject[tagPk].push(tag)
}

let tagsOrderedByPk = []
for (pk of primaryKeys) {
    tagsOrderedByPk = [...tagsOrderedByPk, ...primaryKeysObject[pk]]
}
tagConfig.tags = tagsOrderedByPk

const compareById = (a, b) => {
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
