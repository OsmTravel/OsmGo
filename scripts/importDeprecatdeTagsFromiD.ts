import path from 'path'
import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tagsAndPresets', 'tags.json')
const presetsOsmgoPath = path.join(
    assetsFolder,
    'tagsAndPresets',
    'presets.json'
)

const idRepoPath = path.join(__dirname, '..', '..', 'id-tagging-schema', 'dist')

const tagsOsmgo = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'))

const deprecatedIDPath = path.join(idRepoPath, 'deprecated.json')

const deprecatedID = JSON.parse(fs.readFileSync(deprecatedIDPath, 'utf8'))

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

fs.writeFileSync(tagsOsmgoPath, stringify(tagsOsmgo), 'utf8')
// console.log(tagsOsmgo);

// console.log(deprecatedID)
