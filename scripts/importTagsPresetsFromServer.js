const got = require('got')
const path = require('path')
const fs = require('fs')
const stringify = require('json-stringify-pretty-compact')

// const serverApiUrl = 'http://localhost:8080/api/';
const serverApiUrl = 'https://admin.osmgo.com/api/'

const assetsPath = path.join(__dirname, '..', 'src', 'assets')
const assetsFolderI18n = path.join(__dirname, '..', 'src', 'assets', 'i18n')

const getI18nConfig = async () => {
    return got(`${serverApiUrl}i18n`)
}

const getTagsConfig = async () => {
    return got(`${serverApiUrl}OsmGoTagsConfig/`)
}

const getPresets = async () => {
    return got(`${serverApiUrl}OsmGoPresets/`)
}

const getBaseMaps = async () => {
    return got(`${serverApiUrl}OsmGoBaseMaps/`)
}

const getUiTranslation = async (language) => {
    return got(`${serverApiUrl}UiTranslation/${language}`)
}

const writeTagsPresetsBaseMap = async () => {
    let tagsConfig = await getTagsConfig().json()
    fs.writeFileSync(
        path.join(assetsPath, 'tagsAndPresets', 'tags.json'),
        stringify(tagsConfig),
        'utf8'
    )

    let presets = await getPresets().json()
    fs.writeFileSync(
        path.join(assetsPath, 'tagsAndPresets', 'presets.json'),
        stringify(presets),
        'utf8'
    )
    let basemaps = await getBaseMaps().json()
    fs.writeFileSync(
        path.join(assetsPath, 'tagsAndPresets', 'basemap.json'),
        stringify(basemaps),
        'utf8'
    )
}

const run = async () => {
    const i18Config = await getI18nConfig().json()

    for (let _language of i18Config) {
        const uiTra = await getUiTranslation(_language.code).json()
        fs.writeFileSync(
            path.join(assetsFolderI18n, `${_language.code}.json`),
            stringify(uiTra),
            'utf8'
        )
    }
    // // tags presets & basesmap
    await writeTagsPresetsBaseMap()
}

run()
