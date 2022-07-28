import rp from 'request-promise'
import path from 'path'
import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'
import {
    basemapOsmGoPath,
    i18nFolder,
    presetsOsmgoPath,
    tagsOsmgoPath,
} from './_paths'

// const serverApiUrl = 'http://localhost:8080/api/';
const serverApiUrl = 'https://admin.osmgo.com/api/'

const getI18nConfig = async () => {
    return rp(`${serverApiUrl}i18n`)
}

const getTagsConfig = async () => {
    return rp(`${serverApiUrl}OsmGoTagsConfig/`)
}

const getPresets = async () => {
    return rp(`${serverApiUrl}OsmGoPresets/`)
}

const getBaseMaps = async () => {
    return rp(`${serverApiUrl}OsmGoBaseMaps/`)
}

const getUiTranslation = async (language) => {
    return rp(`${serverApiUrl}UiTranslation/${language}`)
}

const writeTagsPresetsBaseMap = async () => {
    const tagsConfig = JSON.parse(await getTagsConfig())
    fs.writeFileSync(tagsOsmgoPath, stringify(tagsConfig), 'utf8')

    const presets = JSON.parse(await getPresets())
    fs.writeFileSync(presetsOsmgoPath, stringify(presets), 'utf8')
    const basemaps = JSON.parse(await getBaseMaps())
    fs.writeFileSync(basemapOsmGoPath, stringify(basemaps), 'utf8')
}

const run = async () => {
    const i18Config = JSON.parse(await getI18nConfig())

    for (const _language of i18Config) {
        const uiTra = JSON.parse(await getUiTranslation(_language.code))
        fs.writeFileSync(
            path.join(i18nFolder, `${_language.code}.json`),
            stringify(uiTra),
            'utf8'
        )
    }
    // // tags presets & basesmap
    await writeTagsPresetsBaseMap()
}

run()
