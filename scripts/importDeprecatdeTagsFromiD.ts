import path from 'path'
import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'
import { tapTagsPath } from './_paths'
import { readTapTagsFromJson } from './_utils'

const tagsOsmgo = readTapTagsFromJson()

const deprecatedID = require('@openstreetmap/id-tagging-schema/dist/deprecated.json')

for (const depiD of deprecatedID) {
    // console.log(depiD)
    const depOsmgo = tagsOsmgo.tags.find((t) => {
        return JSON.stringify(depiD.old) === JSON.stringify(t.tags)
    })
    if (depOsmgo) {
        console.log(depOsmgo.id)
        depOsmgo['deprecated'] = true
        if (depiD.replace) {
            depOsmgo['replace'] = depiD.replace
        }
    }
    // console.log(depOsmgo)
}

fs.writeFileSync(tapTagsPath, stringify(tagsOsmgo), 'utf8')
// console.log(tagsOsmgo);

// console.log(deprecatedID)
