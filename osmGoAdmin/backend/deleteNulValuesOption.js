const rp = require('request-promise');
const fs = require('fs-extra');
const path = require('path');
const stringify = require("json-stringify-pretty-compact")

const run = async () => {
    [
        {l:'en', c: 'GB'},
        {l:'fr', c: 'FR'},
        {l:'de', c: 'DE'}
    ].forEach( p => {
        const Config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
        const osmGoAssetsPath = Config.osmGoAssetsPath
        const osmgoPresetsPath = path.join(osmGoAssetsPath, 'i18n', p.l, p.c, 'presets.json');
        const osmgoPresets = JSON.parse(fs.readFileSync(osmgoPresetsPath));
     
        // console.log(osmgoPresets);
        for (let k in osmgoPresets){
            let preset = osmgoPresets[k];
            preset['tags'] = preset['tags'].filter( t => t.v !== '')
        }
        fs.writeFileSync( osmgoPresetsPath, stringify(osmgoPresets), 'utf8');


    })

}

run();

// 