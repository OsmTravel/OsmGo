const fs = require('fs');
const path = require('path')
const stringify = require("json-stringify-pretty-compact")

const language = 'de';
const country = 'DE';

const idTranslation = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'id-translation', `${language}.json`), 'utf8'));

const _tPresets = idTranslation[language].presets.presets;
const _tFields = idTranslation[language].presets.fields;


const Config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));

const osmGoAssetsPath = Config.osmGoAssetsPath

const osmgoPresetsPath = path.join(osmGoAssetsPath, 'i18n', language, country, 'presets.json');
const osmgoPresets = JSON.parse(fs.readFileSync(osmgoPresetsPath));

const osmgoTagsPath = path.join(osmGoAssetsPath, 'i18n', language, country, 'tags.json');
const osmgoTags = JSON.parse(fs.readFileSync(osmgoTagsPath));


for (let pk in osmgoTags) {
    let tags = osmgoTags[pk].values;
    for (let tag of tags) {
        const iDkey = `${pk}/${tag.key}`;
        if (_tPresets[iDkey]) {
            const idTag = _tPresets[iDkey];
            tag['lbl'] = idTag.name;
            tag['terms'] = idTag.terms || '';
            tag['fromid'] = true;
        }
    }
}
fs.writeFileSync( osmgoTagsPath, stringify(osmgoTags), 'utf8');
