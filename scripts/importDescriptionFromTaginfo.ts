import rp from 'request-promise'
import fs from 'fs-extra'
import stringify from 'json-stringify-pretty-compact'
import { argv } from 'yargs'
import { tapTagsPath } from './_paths'
import { readTapTagsFromJson } from './_utils'

// let language = argv['_'][0];

let languages: string[] = [
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

let overwrite: boolean = false

if (argv['_'][1] && argv['_'][1] == 'o') {
    overwrite = true
}

const tagsOsmgo = readTapTagsFromJson()

const getStatsByKey = async (key: string, language: string) => {
    var options = {
        uri: `https://taginfo.openstreetmap.org/api/4/key/values?key=${key}&page=1&sortname=count_nodes&sortorder=desc&lang=${language}`,
        json: true, // Automatically parses the JSON string in the response
    }

    console.log('Call: ' + options.uri)
    let res: { data: any[]; rp: any; data_until: any }
    try {
        res = await rp(options)
    } catch (e) {
        console.error(e)
        console.log('Retry call: ' + options.uri)
        res = await rp(options)
    }
    console.log('Called')

    const nbTotal = res.data.reduce(
        (acc: number, cur: { count: number }) => acc + cur.count,
        0
    )
    const result = {
        key: key,
        count: res.rp,
        sum: nbTotal,
        data_until: res.data_until,
        values: [],
    }

    // console.log(nbTotal);

    for (const v of res.data) {
        if (v.description && v.desclang === language) {
            result.values.push({
                value: v.value,
                count: v.count,
                fraction: v.fraction,
                fractionByKey: v.count / nbTotal,
                in_wiki: v.in_wiki,
                'desclang:': v.desclang,
                description: v.description,
            })
        }
    }
    // console.log(result);
    return result
}

const pks: string[] = tagsOsmgo.primaryKeys

const run = async (language: string) => {
    console.log(language)

    for (const pk of pks) {
        const tagInfoKey = (await getStatsByKey(pk, language)).values
        // console.log(tagInfoKey);
        const tagsConfig = tagsOsmgo.tags

        for (let tagConfig of tagsConfig) {
            let keys = Object.keys(tagConfig.tags)
            if (keys.length == 1 && keys[0] === pk) {
                const value = tagConfig.tags[pk]
                const currentTagInfo = tagInfoKey.find(
                    (ti) => ti.value === value
                )
                if (currentTagInfo && currentTagInfo.description) {
                    if (
                        tagConfig.description &&
                        tagConfig.description[language] &&
                        overwrite === false
                    ) {
                        //nada
                    } else {
                        if (!tagConfig.description) {
                            tagConfig['description'] = { en: '' }
                        }
                        tagConfig['description'][language] =
                            currentTagInfo.description
                        // console.log( currentTagInfo.description)
                    }
                }
            }
        }
    }
    fs.writeFileSync(tapTagsPath, stringify(tagsOsmgo), 'utf8')
}

for (const language of languages) {
    run(language)
}

//
