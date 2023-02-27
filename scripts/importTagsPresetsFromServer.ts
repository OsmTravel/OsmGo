import got from 'got'
import path from 'path'
import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'
import { tapBasemapPath, i18nDir, tapPresetsPath, tapTagsPath } from './_paths'

// const serverApiUrl = 'http://localhost:8080/api/';
const serverApiUrl = 'https://admin.osmgo.com/api/'

const getI18nConfig = async () => {
    return got(`${serverApiUrl}i18n`).json()
}

const getTagsConfig = async () => {
    return got(`${serverApiUrl}OsmGoTagsConfig/`).json()
}

const getPresets = async () => {
    return got(`${serverApiUrl}OsmGoPresets/`).json()
}

const getBaseMaps = async () => {
    return got(`${serverApiUrl}OsmGoBaseMaps/`).json()
}

const getUiTranslation = async (language) => {
    return got(`${serverApiUrl}UiTranslation/${language}`).json()
}

const writeTagsPresetsBaseMap = async () => {
    const tagsConfig = await getTagsConfig()
    fs.writeFileSync(tapTagsPath, stringify(tagsConfig), 'utf8')

    const presets = await getPresets()
    fs.writeFileSync(tapPresetsPath, stringify(presets), 'utf8')
    const basemaps = await getBaseMaps()
    fs.writeFileSync(tapBasemapPath, stringify(basemaps), 'utf8')
}

const run = async () => {
    const i18Config: any = await getI18nConfig()

    for (const _language of i18Config) {
        const uiTra = await getUiTranslation(_language.code)
        fs.writeFileSync(
            path.join(i18nDir, `${_language.code}.json`),
            stringify(uiTra),
            'utf8'
        )
    }
    // // tags presets & basesmap
    await writeTagsPresetsBaseMap()
}

run()
