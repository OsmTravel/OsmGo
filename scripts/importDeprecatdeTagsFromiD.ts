import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'
import { tapTagsPath } from './_paths'
import { readTapTagsFromJson } from './_utils'

const tagsOsmgo = readTapTagsFromJson()
const deprecatedID = require('@openstreetmap/id-tagging-schema/dist/deprecated.json')

for (const depiD of deprecatedID) {
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
}

fs.writeFileSync(tapTagsPath, stringify(tagsOsmgo), 'utf8')
