import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'
import { tapTagsPath, tapPresetsPath } from './_paths'

const codeLangue = 'ast'

const presets = JSON.parse(fs.readFileSync(tapPresetsPath, 'utf8'))
const tags = JSON.parse(fs.readFileSync(tapTagsPath, 'utf8'))

for (let pkey in tags) {
    for (let tag of tags[pkey].values) {
        if (tag.lbl && tag.lbl[codeLangue]) {
            delete tag.lbl[codeLangue]
        }

        if (tag.terms && tag.terms[codeLangue]) {
            delete tag.terms[codeLangue]
        }
        if (tag.description && tag.description[codeLangue]) {
            delete tag.description[codeLangue]
        }

        if (tag.alert && tag.alert[codeLangue]) {
            delete tag.terms[codeLangue]
        }
    }
}

for (let pkey in presets) {
    if (presets[pkey].options) {
        let options = presets[pkey].options
        for (let o of options) {
            if (o.lbl[codeLangue]) {
                delete o.lbl[codeLangue]
            }
        }
    }

    if (presets[pkey].lbl && presets[pkey].lbl[codeLangue]) {
        delete presets[pkey].lbl[codeLangue]
    }
}

fs.writeFileSync(tapPresetsPath, stringify(presets), 'utf8')
fs.writeFileSync(tapTagsPath, stringify(tags), 'utf8')
