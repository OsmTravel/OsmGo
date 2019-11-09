const path = require('path');
const fs = require('fs');
const stringify = require("json-stringify-pretty-compact")

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const assetsFolderI18n = path.join(assetsFolder, 'i18n')



const LANGUAGE = 'de'
const COUNTRY = 'DE'


const getOldPresets = (languageCode = 'fr', countryCode = 'FR') => {

    let tagsPath = path.join(assetsFolderI18n, languageCode, countryCode, 'presets.json')
    const presets = JSON.parse(fs.readFileSync(tagsPath));
    return presets;
}

const newPresetsPath = path.join(assetsFolder, 'presets.json')

let oldPresets = getOldPresets(LANGUAGE, COUNTRY);
// console.log(oldTags);




// console.log(oldPresets);
// let newPresetsConfig = {}
let newPresetsConfig = JSON.parse(fs.readFileSync(newPresetsPath, 'utf8'));

for (let id in oldPresets) {
    let currentPresets = oldPresets[id];

    if (!newPresetsConfig[id]){
        newPresetsConfig[id] = {};
        newPresetsConfig[id]['key'] = currentPresets['key']
        newPresetsConfig[id]['type'] = currentPresets['type']
        // newPresetsConfig[id]['countryCodes'] = [COUNTRY];
        newPresetsConfig[id]['countryCodes'] = false;
        newPresetsConfig[id]['lbl'] = {};
        newPresetsConfig[id]['lbl'][LANGUAGE] = currentPresets['lbl']
        newPresetsConfig[id]['options'] = [];
       
      
    }  else{
        // newPresetsConfig[id]['countryCodes'].push(COUNTRY);
        newPresetsConfig[id]['lbl'][LANGUAGE] = currentPresets['lbl']
    }

    for (let tagOpt of currentPresets.tags){
        let currentPresetOpt = newPresetsConfig[id]['options'].find(o => o.v === tagOpt.v);

        if (!currentPresetOpt){
            const newOpt = {}
            newOpt['v'] = tagOpt.v;
            newOpt['lbl'] = {};
            newOpt['lbl'][LANGUAGE] = tagOpt.lbl;
            newOpt['countryCodes'] = false;
            // newOpt['countryCodes'] = [COUNTRY];
            // currentPresetOpt = newOpt
            newPresetsConfig[id]['options'].push(newOpt)
        }

        else {
            currentPresetOpt['lbl'][LANGUAGE] = tagOpt.lbl
            // currentPresetOpt['countryCodes'].push(COUNTRY);
        }


    }


    // console.log(currentPresets);

}
//     const currentPkeyTags = oldTags[pKey];
//     if (!newTagsConfig[pKey]) {
//         newTagsConfig[pKey] = {}
//     }
//     if (!newTagsConfig[pKey]['lbl']) {
//         newTagsConfig[pKey]['lbl'] = {};
//     }
//     newTagsConfig[pKey]['lbl'][LANGUAGE] = currentPkeyTags['lbl'];

//     if (!newTagsConfig[pKey].values) {
//         newTagsConfig[pKey].values = [];
//     }

//     for (let oldTag of currentPkeyTags.values) {
//         // console.log(oldTag)
//         let cloneOldTag = { ...oldTag };

//         let currentNewTag = newTagsConfig[pKey].values.find(o => o.key === oldTag.key);
//         if (!currentNewTag) {
//             currentNewTag = {};

//             currentNewTag['key'] = cloneOldTag['key']
//             currentNewTag['icon'] = cloneOldTag['icon']
//             currentNewTag['markerColor'] = cloneOldTag['markerColor']
//             currentNewTag['presets'] = cloneOldTag['presets']
//             currentNewTag['deprecated'] = cloneOldTag['deprecated'] || false
            

            
//             currentNewTag['lbl'] = {};
//             currentNewTag['terms'] = {};
//             currentNewTag['description'] = {};
//             currentNewTag['warning'] = {};
//             currentNewTag['alert'] = {};
//             console.log(currentNewTag['lbl'])




//         }
//         currentNewTag['lbl'][LANGUAGE] = cloneOldTag['lbl']
//         currentNewTag['terms'][LANGUAGE] = cloneOldTag['terms']
//         currentNewTag['description'][LANGUAGE] = cloneOldTag['description']
//         currentNewTag['warning'][LANGUAGE] = cloneOldTag['warning']
//         currentNewTag['alert'][LANGUAGE] = cloneOldTag['alert']
//         newTagsConfig[pKey].values = [...newTagsConfig[pKey].values, currentNewTag];
//         // console.log(newTagsConfig[pKey])
//     }


//     // console.log(newTagsConfig[pKey]['lbl'])
// }

// // console.log(stringify(newTagsConfig));
fs.writeFileSync(newPresetsPath, stringify(newPresetsConfig), 'utf8');
// // fs.writeFileSync(newTagsPath, JSON.stringify(newTagsConfig), 'utf8');