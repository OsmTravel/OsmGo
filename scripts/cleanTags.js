const path = require('path');
const fs = require('fs');
const stringify = require("json-stringify-pretty-compact")

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsPath = path.join(assetsFolder, 'tags&presets', 'tags.json') 

const allTags = JSON.parse( fs.readFileSync(tagsPath, 'utf8'));



const objectIsEmpty = (obj) => {
    for (let k in obj){
        if (obj[k] && obj[k]!=='' ){
            return false
        }
    }

    return true;
}


for (let pkey in allTags){
    // console.log(allTags[pkey]);

    const tags = allTags[pkey].values;

    for (let tag of tags){

        // null or "" (tems, warning, alert, description) => delete this prop
        if (tag.terms){
            if (objectIsEmpty(tag.terms)){
                delete tag.terms
            }
        }
        if (tag.warning){
            if (objectIsEmpty(tag.warning)){
                delete tag.warning
            }
        }
        if (tag.alert){
            if (objectIsEmpty(tag.alert)){
                delete tag.alert
            }
        }

        if (tag.description){
            if (objectIsEmpty(tag.description)){
                delete tag.description
            }
        }

        // "deprecated": false, => delete this prop
        if (tag.deprecated === false){
            delete tag.deprecated
        }

        // en must be present !
        if ( tag.lbl && !tag.lbl.en){
            console.log(tag);
        }
        if ( tag.description &&  !Object.keys(tag.description).includes('en')){
            console.log(tag);
        }
        if ( tag.alert &&  !Object.keys(tag.alert).includes('en')){
            console.log(tag);
        }
        if ( tag.warning &&  !Object.keys(tag.warning).includes('en')){
            console.log(tag);
        }
        if ( tag.terms &&  !Object.keys(tag.terms).includes('en')){
            console.log(tag);
        }

        // prop = null or "" (!en) => delete
        // prop.de === prop.en => delete prop.de

        if ( tag.lbl){
            for ( let l in tag.lbl){
                if (l !== 'en'){
                    if ( !tag.lbl[l] || tag.lbl[l] === ''){
                        delete tag.lbl[l]
                    }
                    if (tag.lbl[l] === tag.lbl['en'] ){
                        delete tag.lbl[l]
                    }
                }
            }
        }

        if ( tag.description){
            for ( let l in tag.description){
                if (l !== 'en'){
                    if ( !tag.description[l] || tag.description[l] === ''){
                        delete tag.description[l]
                    }
                    if (tag.description[l] === tag.description['en'] ){
                        delete tag.description[l]
                    }
                }
            }
        }

        if ( tag.alert){
            for ( let l in tag.alert){
                if (l !== 'en'){
                    if ( !tag.alert[l] || tag.alert[l] === ''){
                        delete tag.alert[l]
                    }
                    if (tag.alert[l] === tag.alert['en'] ){
                        delete tag.alert[l]
                    }
                }
            }
        }

        if ( tag.warning){
            for ( let l in tag.warning){
                if (l !== 'en'){
                    if ( !tag.warning[l] || tag.warning[l] === ''){
                        delete tag.warning[l]
                    }
                    if (tag.warning[l] === tag.warning['en'] ){
                        delete tag.warning[l]
                    }
                }
            }
        }
        
        if ( tag.terms){
            for ( let l in tag.terms){
                if (l !== 'en'){
                    if ( !tag.terms[l] || tag.terms[l] === ''){
                        delete tag.terms[l]
                    }
                    if (tag.terms[l] === tag.terms['en'] ){
                        delete tag.terms[l]
                    }
                }
            }
        }



        // // terms, lbl, description, alert, warning : if de === en => delete de
        // if (tag.lbl.de){
        //     i
        // }

        // console.log(tag);
    }
}


fs.writeFileSync(tagsPath, stringify(allTags), 'utf8');