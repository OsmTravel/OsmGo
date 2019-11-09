const path = require('path');
const fs = require('fs');
const stringify = require("json-stringify-pretty-compact")

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const assetsFolderI18n = path.join(assetsFolder, 'i18n')


const getOldTags = (languageCode = 'fr', countryCode = 'FR') => {
    let tagsPath = path.join(assetsFolderI18n, languageCode, countryCode, 'tags.json')
    const tags = JSON.parse(fs.readFileSync(tagsPath));
    return tags;
}

const newTagsPath = path.join(assetsFolder, 'tags.json')

const LANGUAGE = 'de'
const COUNTRY = 'DE'
let oldTags = getOldTags(LANGUAGE, COUNTRY);
// console.log(oldTags);

// let newTagsConfig = {}

let newTagsConfig = JSON.parse(fs.readFileSync(newTagsPath, 'utf8'));

for (let pKey in oldTags) {
    const currentPkeyTags = oldTags[pKey];
    if (!newTagsConfig[pKey]) {
        newTagsConfig[pKey] = {}

        if (oldTags[pKey][["exclude_way_values"]]){
            newTagsConfig[pKey]["exclude_way_values"] = [...oldTags[pKey]["exclude_way_values"] ]
        }
        
    }
    if (!newTagsConfig[pKey]['lbl']) {
        newTagsConfig[pKey]['lbl'] = {};
    }
    newTagsConfig[pKey]['lbl'][LANGUAGE] = currentPkeyTags['lbl'];

    if (!newTagsConfig[pKey].values) {
        newTagsConfig[pKey].values = [];
    }

    for (let oldTag of currentPkeyTags.values) {
        // console.log(oldTag)
        let cloneOldTag = { ...oldTag };

        let currentNewTag = newTagsConfig[pKey].values.find(o => o.key === oldTag.key);
        let isNew = false;
        // console.log(currentNewTag);
        if (!currentNewTag) {
            isNew = true;
            currentNewTag = {};

            currentNewTag['key'] = cloneOldTag['key']
            currentNewTag['icon'] = cloneOldTag['icon']
            currentNewTag['markerColor'] = cloneOldTag['markerColor']
            currentNewTag['presets'] = cloneOldTag['presets']
            currentNewTag['deprecated'] = cloneOldTag['deprecated'] || false
            

            
            currentNewTag['lbl'] = {};
            currentNewTag['terms'] = {};
            currentNewTag['description'] = {};
            currentNewTag['warning'] = {};
            currentNewTag['alert'] = {};
            // console.log(currentNewTag['lbl'])


            
        }
        currentNewTag['lbl'][LANGUAGE] = cloneOldTag['lbl']
        currentNewTag['terms'][LANGUAGE] = cloneOldTag['terms']
        currentNewTag['description'][LANGUAGE] = cloneOldTag['description']
        currentNewTag['warning'][LANGUAGE] = cloneOldTag['warning']
        currentNewTag['alert'][LANGUAGE] = cloneOldTag['alert']
        if (!isNew) {
            const ind = newTagsConfig[pKey].values.findIndex( o => o.key == oldTag.key)
            newTagsConfig[pKey].values[ind] = currentNewTag;
        } else {
            console.log(currentNewTag);
            newTagsConfig[pKey].values.push(currentNewTag)
        }
        
        // console.log(newTagsConfig[pKey])
    }


    // console.log(newTagsConfig[pKey]['lbl'])
}

// console.log(stringify(newTagsConfig));
fs.writeFileSync(newTagsPath, stringify(newTagsConfig), 'utf8');
// fs.writeFileSync(newTagsPath, JSON.stringify(newTagsConfig), 'utf8');