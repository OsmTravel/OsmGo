// zh-CN', 'zh-HK', 'zh-TW',

const path = require('path');
const fs = require('fs');
const stringify = require("json-stringify-pretty-compact")
const rp = require('request-promise');

const _ =  require('lodash')


const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tags&presets', 'tags.json')
const presetsOsmgoPath = path.join(assetsFolder, 'tags&presets', 'presets.json')


const presets = JSON.parse(fs.readFileSync(presetsOsmgoPath, 'utf8'));


for (let pkey in presets){

    if (presets[pkey].options){
        let options =presets[pkey].options
        for (let o of options){
            if (!o.lbl['zh'] && !o.lbl['zh-CN']){
                o.lbl['zh'] = _.clone(o.lbl['zh-CN'])
            }
            if (o.lbl['zh-CN']){
                delete o.lbl['zh-CN']
            }

            if (o.lbl['zh-HK']){
                delete o.lbl['zh-HK']
            }
            if (o.lbl['zh-TW']){
                delete o.lbl['zh-TW']
            }

        }

    }
  

    }



fs.writeFileSync(presetsOsmgoPath, stringify(presets), 'utf8')
