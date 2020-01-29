const rp = require('request-promise');
const path = require('path');
const fs = require('fs');
const stringify = require("json-stringify-pretty-compact")

// const serverApiUrl = 'http://localhost:8080/api/';
const serverApiUrl = 'https://admin.osmgo.com/api/'

const assetsPath= path.join(__dirname, '..', 'src', 'assets')
const assetsFolderI18n = path.join(__dirname, '..', 'src', 'assets', 'i18n')


const getI18nConfig = async () => {
    return rp(`${serverApiUrl}i18n`);
}


const getTagsConfig = async () => {
    return rp(`${serverApiUrl}OsmGoTagsConfig/`);
}

const getPresets = async () => {
    return rp(`${serverApiUrl}OsmGoPresets/`);
}

const getBaseMaps = async () => {
    return rp(`${serverApiUrl}OsmGoBaseMaps/`);
}

const getUiTranslation = async (language) => {
    return rp(`${serverApiUrl}UiTranslation/${language}`);
}

const writeTagsPresetsBaseMap = async () => {
    let tagsConfig = JSON.parse((await getTagsConfig()));
    fs.writeFileSync(path.join(assetsPath, 'tagsAndPresets', 'tags.json'), stringify(tagsConfig), 'utf8')

    let presets = JSON.parse((await getPresets()));
    fs.writeFileSync(path.join(assetsPath, 'tagsAndPresets', 'presets.json'), stringify(presets), 'utf8')
    let basemaps = JSON.parse((await getBaseMaps()));
    fs.writeFileSync(path.join(assetsPath, 'tagsAndPresets', 'basemap.json'), stringify(basemaps), 'utf8')
}

const run = async () => {
    const i18Config = JSON.parse((await getI18nConfig()));

    for ( let _language of i18Config){
        const uiTra = JSON.parse((await getUiTranslation(_language.code)));
        fs.writeFileSync(path.join(assetsFolderI18n, `${_language.code}.json`), stringify(uiTra), 'utf8')
    };
    // // tags presets & basesmap
    await writeTagsPresetsBaseMap()
    
}

run();