const path = require('path');
const fs = require('fs');
const stringify = require("json-stringify-pretty-compact")

const _ = require('lodash');

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tagsAndPresets', 'tags.json')
const presetsOsmgoPath = path.join(assetsFolder, 'tagsAndPresets', 'presets.json')

const idRepoPath = path.join(__dirname, '..', '..', 'iD')


const tagsOsmgo = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'));

const deprecatedIDPath = path.join(idRepoPath, 'data', 'deprecated.json');

const deprecatedID = JSON.parse(fs.readFileSync(deprecatedIDPath, 'utf8')).dataDeprecated;

for (let depiD of deprecatedID){
    // console.log(depiD)
    let depOsmgo = tagsOsmgo.tags.find( t => {
       return JSON.stringify(depiD.old) === JSON.stringify( t.tags)
    })
    if (depOsmgo){
        console.log(depOsmgo.id)
        depOsmgo['deprecated'] = true;
        if (depiD.replace){
            depOsmgo['replace'] = depiD.replace;
        }
    }
    // console.log(depOsmgo)
}


fs.writeFileSync(tagsOsmgoPath, stringify(tagsOsmgo), 'utf8')
// console.log(tagsOsmgo);

// console.log(deprecatedID)
