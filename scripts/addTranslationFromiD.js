const path = require('path');
const fs = require('fs');
const stringify = require("json-stringify-pretty-compact")
const argv = require('yargs').argv

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tags&presets', 'tags.json')
const presetsOsmgoPath = path.join(assetsFolder, 'tags&presets', 'presets.json')

const idRepoPath = path.join(__dirname, '..', '..', 'iD')
const idTranslationPath = path.join(idRepoPath, 'dist', 'locales');



let language = argv['_'][0];

if (!language){
    console.error(language, 'oops')
    return 
}

let overwrite = false;

if (argv['_'][1] && argv['_'][1] == 'o'){
    console.log(overwrite);
    overwrite = true;
}

const idTranslationFilePath = path.join(idTranslationPath, `${language}.json`)

const idTr = JSON.parse(fs.readFileSync(idTranslationFilePath, 'utf8'))[language];

// const presetsIDPath = path.join(idRepoPath, 'data', 'presets', 'fields.json')

const tagsOsmgo = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'));
const presetsOsmgo = JSON.parse(fs.readFileSync(presetsOsmgoPath, 'utf8'));

const trFields = idTr.presets.fields;
const trPresets = idTr.presets.presets
// console.log(trPresets);


// TAGS
const importTrTags = () => {
    for (let pkey in tagsOsmgo){

        for(let tag of tagsOsmgo[pkey].values){
            // console.log(tag.iDRef);
            if (tag.iDRef){
                if (trPresets[tag.iDRef] && trPresets[tag.iDRef].name){
                    if (!tag.lbl[language] || overwrite){
                        tag.lbl[language] = trPresets[tag.iDRef].name
                    }
                  
                }
                
                if (trPresets[tag.iDRef] && trPresets[tag.iDRef].terms){
                    if (tag.terms === undefined){
                        tag['terms'] = {}
    
                    }
                    if (!tag.terms[language] || overwrite){
                        tag.terms[language] = trPresets[tag.iDRef].terms
                    }
                   
                }
                // console.info(tag)
            //     console.log(trPresets[tag.iDRef]);
            // console.log(tag.lbl[language])
            }  
        }
    }
    
    fs.writeFileSync(tagsOsmgoPath, stringify(tagsOsmgo), 'utf8');
}


const importFields = () => {
    for (let k in presetsOsmgo){
        const osmGoPreset = presetsOsmgo[k];
        if (trFields[k]){
            if (trFields[k].label){
                osmGoPreset.lbl[language] = trFields[k].label;
            }

            if (trFields[k].options){
                const iDoptions = trFields[k].options;
                for (let osmgoOpt of osmGoPreset.options){
                    if (iDoptions[osmgoOpt.v]){
                        if (typeof iDoptions[osmgoOpt.v] === 'string'){
                            osmgoOpt.lbl[language] = iDoptions[osmgoOpt.v]
                        } 
                        else {
                            if (iDoptions[osmgoOpt.v].title){
                                osmgoOpt.lbl[language] = iDoptions[osmgoOpt.v].title
                            }
                        }
                    }
                }
            }
        }
        // 
    }

    fs.writeFileSync(presetsOsmgoPath, stringify(presetsOsmgo), 'utf8');

}

tagsOsmgo

importTrTags();
importFields();