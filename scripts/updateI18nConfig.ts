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

const tagsOsmgo = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'))

const languageCode = []

for (let pkey in tagsOsmgo) {
    for (let tag of tagsOsmgo[pkey].values) {
        Object.keys(tag.lbl).forEach((t) => {
            if (!languageCode.includes(t)) {
                languageCode.push(t)
            }
        })
    }
}

const iso639 = JSON.parse(
    fs.readFileSync(path.join('..', 'resources', 'iso_639-1.json'), 'utf8')
)

const langWithIso639 = []

languageCode.forEach((l) => {
    if (!iso639[l]) {
        console.log(l)
    } else {
        langWithIso639.push(iso639[l])
    }
})

// console.log(langWithIso639)

const i18path = path.join(assetsFolder, 'i18n', 'i18n.json')

const i18nConf = JSON.parse(fs.readFileSync(i18path, 'utf8'))
i18nConf['tags'] = langWithIso639

fs.writeFileSync(i18path, stringify(i18nConf), 'utf8')
console.log(languageCode)
