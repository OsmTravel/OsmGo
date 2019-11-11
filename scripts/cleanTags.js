const path = require('path');
const fs = require('fs');
const stringify = require("json-stringify-pretty-compact")
const rp = require('request-promise');


const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tags&presets', 'tags.json')
const presetsOsmgoPath = path.join(assetsFolder, 'tags&presets', 'presets.json')

const tagsOsmgo = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'));


for (let pkey in tagsOsmgo){

    for(let tag of tagsOsmgo[pkey].values){
        if (tag.icon === undefined){
            tag.icon = '';
            console.log( tag.icon)
        }
        
        
    }

}

fs.writeFileSync(tagsOsmgoPath, stringify(tagsOsmgo));