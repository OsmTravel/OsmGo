import path from 'path'
import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'
import yargs from 'yargs'
import { tapTagsPath, tapPresetsPath, idtsTranslationsDir } from './_paths'
import { readTapPresetsFromJson, readTapTagsFromJson } from './_utils'
import { defaultLanguages } from './_i18n'

const args = yargs(process.argv.slice(2))
    .usage(
        `$0 [args]
        
        Adds translations for tags from the iD editor.
        This script looks up the translations in the third-party repository of the iD editor and aligns its definitions with the OsmGo i18n data.`
    )
    .help('help')
    .version(false)
    .option('overwrite', {
        alias: 'o',
        type: 'boolean',
        description: 'Overwrite tag descriptions in multiple languages',
        default: false,
    })
    .option('language', {
        type: 'array',
        choices: defaultLanguages,
        default: defaultLanguages,
        description:
            'Languages that should be looked up through the taginfo.openstreetmap.org service',
    })
    .parseSync()

for (const language of args.language as string[]) {
    const idTranslationFilePath = path.join(
        idtsTranslationsDir,
        `${language}.json`
    )

    const idTr = JSON.parse(fs.readFileSync(idTranslationFilePath, 'utf8'))[
        language
    ]

    // const presetsIDPath = path.join(idRepoPath, 'data', 'presets', 'fields.json')

    const tagsOsmgoConfig = readTapTagsFromJson()
    const tagsOsmgo = tagsOsmgoConfig.tags
    const presetsOsmgo = readTapPresetsFromJson()

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
                    if (!tag.lbl[language] || args.overwrite) {
                        tag.lbl[language] = trPresets[tag.iDRef].name
                    }
                }

                if (trPresets[tag.iDRef] && trPresets[tag.iDRef].terms) {
                    if (tag.terms === undefined) {
                        tag['terms'] = {}
                    }
                    if (!tag.terms[language] || args.overwrite) {
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
                        args.overwrite
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
                                if (!osmgoOpt.lbl[language] || args.overwrite) {
                                    osmgoOpt.lbl[language] =
                                        iDoptions[osmgoOpt.v]
                                }
                            } else {
                                if (iDoptions[osmgoOpt.v].title) {
                                    if (
                                        !osmgoOpt.lbl[language] ||
                                        args.overwrite
                                    ) {
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
