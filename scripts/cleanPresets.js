const path = require('path');
const fs = require('fs');
const stringify = require("json-stringify-pretty-compact")

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const presetsPath = path.join(assetsFolder, 'tags&presets', 'presets.json')

const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));



const objectIsEmpty = (obj) => {
    for (let k in obj) {
        if (obj[k] && obj[k] !== '') {
            return false
        }
    }
    return true;
}


for (let pkey in presets) {
    // console.log(allTags[pkey]);

    const preset = presets[pkey];
    if (preset.lbl && !preset.lbl['en']) {
        preset.lbl['en'] = pkey
    }

    if (preset.lbl) {
        for (let l in preset.lbl) {
            if (l !== 'en') {
                if (preset.lbl[l] === preset.lbl['en']) {
                    delete preset.lbl[l]
                }
            }
        }
    }

    // console.log(preset.type);
    if (!['select', 'list'].includes(preset.type) && preset.options) {
        // console.log(preset.type);
        delete preset.options
    }

    // delete preset.countryCodes;
    if (preset.options) {


        for (let option of preset.options) {

            if (option.countryCodes === false) {
                delete option.countryCodes;
            }

            if (option.lbl && !option.lbl['en']) {
                option.lbl['en'] = option.v
            }


            if (option.lbl) {
                for (let l in option.lbl) {
                    if (l !== 'en') {
                        if (option.lbl[l] === option.lbl['en']) {
                            delete option.lbl[l]
                        }
                    }
                }
            }

        }
    }
}


fs.writeFileSync(presetsPath, stringify(presets), 'utf8');