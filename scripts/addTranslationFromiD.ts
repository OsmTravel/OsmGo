import path from 'path'
import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'
import { argv } from 'yargs'
import { tapTagsPath, tapPresetsPath, idtsTranslationsDir } from './_paths'

const languages = [
    'en',
    'fr',
    'de',
    'es',
    'pt',
    'it',
    'ru',
    'bg',
    'bn',
    'bs',
    'cs',
    'cy',
    'da',
    'dv',
    'el',
    'eo',
    'et',
    'fa',
    'fi',
    'gl',
    'he',
    'hr',
    'hu',
    'id',
    'is',
    'ja',
    'ko',
    'lt',
    'lv',
    'mk',
    'ms',
    'nl',
    'no',
    'pl',
    'ro',
    'sk',
    'sl',
    'sr',
    'sv',
    'tr',
    'uk',
    'vi',
    'zh',
    'eu',
]

// if (!language) {
//   console.error(language, "oops");
//   return;
// }

let overwrite = false

if (argv['_'][1] && argv['_'][1] == 'o') {
    console.log(overwrite)
    overwrite = true
}

for (const language of languages) {
    const idTranslationFilePath = path.join(
        idtsTranslationsDir,
        `${language}.json`
    )

    const idTr = JSON.parse(fs.readFileSync(idTranslationFilePath, 'utf8'))[
        language
    ]

    // const presetsIDPath = path.join(idRepoPath, 'data', 'presets', 'fields.json')

    const tagsOsmgoConfig = JSON.parse(fs.readFileSync(tapTagsPath, 'utf8'))
    const tagsOsmgo = tagsOsmgoConfig.tags
    const presetsOsmgo = JSON.parse(fs.readFileSync(tapPresetsPath, 'utf8'))

    if (!idTr.presets) {
        console.log('Remove language (no presets): ' + language)
        continue
    }

    const trFields = idTr.presets.fields
    const trPresets = idTr.presets.presets

    if (!trFields || !trPresets) {
        console.log('Remove language (no fields or presets) ' + language)
        continue
    }

    // console.log(trPresets);

    // TAGS
    const importTrTags = (language: string) => {
        for (const tag of tagsOsmgo) {
            // console.log(tag.iDRef);
            if (tag.iDRef) {
                if (trPresets[tag.iDRef] && trPresets[tag.iDRef].name) {
                    if (!tag.lbl[language] || overwrite) {
                        tag.lbl[language] = trPresets[tag.iDRef].name
                    }
                }

                if (trPresets[tag.iDRef] && trPresets[tag.iDRef].terms) {
                    if (tag.terms === undefined) {
                        tag['terms'] = {}
                    }
                    if (!tag.terms[language] || overwrite) {
                        tag.terms[language] = trPresets[tag.iDRef].terms
                    }
                }
                // console.info(tag)
                //     console.log(trPresets[tag.iDRef]);
                // console.log(tag.lbl[language])
            }
        }

        fs.writeFileSync(tapTagsPath, stringify(tagsOsmgoConfig), 'utf8')
    }

    const importFields = (language: string) => {
        for (const k in presetsOsmgo) {
            const osmGoPreset = presetsOsmgo[k]
            //   console.log(osmGoPreset);
            if (trFields[k]) {
                if (trFields[k].label) {
                    // console.log(osmGoPreset);
                    if (
                        !osmGoPreset.lbl ||
                        !osmGoPreset.lbl[language] ||
                        overwrite
                    ) {
                        if (!osmGoPreset.lbl) {
                            osmGoPreset['lbl'] = {}
                        }
                        osmGoPreset.lbl[language] = trFields[k].label
                    }
                }

                if (trFields[k].options) {
                    const iDoptions = trFields[k].options

                    if (!osmGoPreset.options) {
                        osmGoPreset.options = []
                    }

                    for (const osmgoOpt of osmGoPreset.options) {
                        if (iDoptions[osmgoOpt.v]) {
                            if (typeof iDoptions[osmgoOpt.v] === 'string') {
                                if (!osmgoOpt.lbl[language] || overwrite) {
                                    osmgoOpt.lbl[language] =
                                        iDoptions[osmgoOpt.v]
                                }
                            } else {
                                if (iDoptions[osmgoOpt.v].title) {
                                    if (!osmgoOpt.lbl[language] || overwrite) {
                                        osmgoOpt.lbl[language] =
                                            iDoptions[osmgoOpt.v].title
                                    }
                                }
                            }
                        }
                    }
                }
            }
            //
        }

        fs.writeFileSync(tapPresetsPath, stringify(presetsOsmgo), 'utf8')
    }

    importTrTags(language)
    importFields(language)
}
