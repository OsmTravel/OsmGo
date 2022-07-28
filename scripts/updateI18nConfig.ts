import path from 'path'
import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'
import { i18nDir, resourcesDir, tapTagsPath } from './_paths'

const tagsOsmgo = JSON.parse(fs.readFileSync(tapTagsPath, 'utf8'))

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
    fs.readFileSync(path.join(resourcesDir, 'iso_639-1.json'), 'utf8')
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

const i18path = path.join(i18nDir, 'i18n.json')

const i18nConf = JSON.parse(fs.readFileSync(i18path, 'utf8'))
i18nConf['tags'] = langWithIso639

fs.writeFileSync(i18path, stringify(i18nConf), 'utf8')
console.log(languageCode)
