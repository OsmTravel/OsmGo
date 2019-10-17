const rp = require('request-promise');
const path = require('path');
const fs = require('fs');
const stringify = require("json-stringify-pretty-compact")

// const serverApiUrl = 'http://localhost:8080/api/';
const serverApiUrl = 'https://osmgo.dogeo.fr/admin/api/'

const assetsFolderI18n = path.join(__dirname, '..', 'src', 'assets', 'i18n')


const getI18nConfig = async () => {
    return rp(`${serverApiUrl}i18`);
}


const getTags = async (language, country) => {
    return rp(`${serverApiUrl}OsmGoTags/${language}/${country}`);
}

const getPresets = async (language, country) => {
    return rp(`${serverApiUrl}OsmGoPresets/${language}/${country}`);
}

const getBaseMaps = async (language, country) => {
    return rp(`${serverApiUrl}OsmGoBaseMaps/${language}/${country}`);
}

const getUiTranslation = async (language) => {
    return rp(`${serverApiUrl}UiTranslation/${language}`);
}

const writeTagsPresetsBaseMap = async (language, country) => {
    let tags = JSON.parse((await getTags(language, country)));
    fs.writeFileSync(path.join(assetsFolderI18n, language, country, 'tags.json'), stringify(tags), 'utf8')
    let presets = JSON.parse((await getPresets(language, country)));
    fs.writeFileSync(path.join(assetsFolderI18n, language, country, 'presets.json'), stringify(presets), 'utf8')
    let basemaps = JSON.parse((await getBaseMaps(language, country)));
    fs.writeFileSync(path.join(assetsFolderI18n, language, country, 'basemap.json'), stringify(basemaps), 'utf8')
}

const run = async () => {
    const i18Config = JSON.parse((await getI18nConfig()));

    for ( let _language of i18Config.interface){
        console.log(_language)
        const uiTra = JSON.parse((await getUiTranslation(_language)));
        fs.writeFileSync(path.join(assetsFolderI18n, `${_language}.json`), stringify(uiTra), 'utf8')
    };

    // // tags presets & basesmap
    for ( let t of i18Config.tags){
        let _language = t.language;
        for ( let c of t.country){
            let _country = c.region;
            console.log(_language, '-',_country);
            await writeTagsPresetsBaseMap(_language, _country)
        }
    }
}

run();