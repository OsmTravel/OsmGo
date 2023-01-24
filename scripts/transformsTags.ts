import path from 'path'
import fs from 'fs-extra'
import stringify from 'json-stringify-pretty-compact'
import { tapDir, tapTagsPath } from './_paths'
import { readTapTagsFromJson } from './_utils'

const newConfigPath = path.join(tapDir, 'newTags.json')
const tagsOsmgo = readTapTagsFromJson()

const tagsResult = []
const primaryKeys = []

for (const pkey in tagsOsmgo) {
    primaryKeys.push(pkey)
    for (let i = 0; i < tagsOsmgo[pkey].values.length; i++) {
        const tag = tagsOsmgo[pkey].values[i]
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
