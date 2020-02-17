const path = require('path');
const fs = require('fs');
const stringify = require("json-stringify-pretty-compact")

const _ = require('lodash');

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tagsAndPresets', 'tags.json')

const tagConfig = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'))
const tagsOsmgo = tagConfig.tags;

const exludesIds = [];
for (let tag of tagsOsmgo){
    const id = tag.id;
    const pk = id.split('/')[0]
    if (pk == 'barrier'){
     
        // if (tag.geometry.includes('point') || tag.geometry.includes('vertex')){
           
        // } else {
            console.log(tag.geometry)
            exludesIds.push(id)
        // }
        
    }
    // console.log(pk);

}
console.log(exludesIds)