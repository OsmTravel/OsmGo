const path = require('path')
const fs = require('fs-extra')
const stringify = require('json-stringify-pretty-compact')

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tagsAndPresets', 'tags.json')
const newConfigPath = path.join(assetsFolder, 'tagsAndPresets', 'newTags.json')

const tagsOsmgo = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'))

const tagsResult = []
const primaryKeys = []

for (let pkey in tagsOsmgo) {
    primaryKeys.push(pkey)
    for (let i = 0; i < tagsOsmgo[pkey].values.length; i++) {
        let tag = tagsOsmgo[pkey].values[i]
        tagsResult.push(tag)
    }
}
console.log(tagsResult.length)
console.log(primaryKeys)

const result = {
    primaryKeys: primaryKeys,
    tags: tagsResult,
}
fs.writeFileSync(newConfigPath, stringify(result))
