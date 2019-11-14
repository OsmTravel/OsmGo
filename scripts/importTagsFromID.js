const path = require('path');
const fs = require('fs');
const stringify = require("json-stringify-pretty-compact")

const _ = require('lodash');

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tags&presets', 'tags.json')
const presetsOsmgoPath = path.join(assetsFolder, 'tags&presets', 'presets.json')

const idRepoPath = path.join(__dirname, '..', '..', 'iD')
const tagsIDPath = path.join(idRepoPath, 'data', 'presets', 'presets.json');
const presetsIDPath = path.join(idRepoPath, 'data', 'presets', 'fields.json')

const tagsOsmgo = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'));
const presetsOsmgo = JSON.parse(fs.readFileSync(presetsOsmgoPath, 'utf8'));

const tagsID = JSON.parse(fs.readFileSync(tagsIDPath, 'utf8')).presets;
const presetsID = JSON.parse(fs.readFileSync(presetsIDPath, 'utf8')).fields;

const osmgoPkeys = Object.keys(tagsOsmgo);


let idTagsFieldsListId = []; // list of id of fields to add...
const tagsIDpkeys = Object.keys(tagsID)
    .filter(k => k.split('/').length >= 2) // only "generic" key for now
    .filter(k => osmgoPkeys.includes(k.split('/')[0])) // only primaryKeys of Osm Go for now
    .filter(k => !tagsOsmgo[k.split('/')[0]]['exclude_way_values'] ||
        !tagsOsmgo[k.split('/')[0]]['exclude_way_values'].includes(k.split('/')[1])) // no excludes ways...
// .map( k => { return {"pkey": k.split('/')[0], "value":k.split('/')[1], "id": k } })

/* IMPORT TAGS */
for (let iDid of tagsIDpkeys) {
    // console.log(iDid);
    const tagiD = tagsID[iDid];
    let iDFields = []; // for this tag
    let iDMoreFields = []
    if (tagiD['addTags'] && tagiD['addTags']['brand']){
        continue;
        console.log(tagiD.tags);
        console.log(tagiD.addTags)
        console.log(iDid)
    }
    // console.log('-------------')
    // console.log('iD tags', tagiD.tags);
    // // console.log(tagiD.addTags)
    // // console.log(iDid)
    // console.log('-------------')

    if (tagiD.fields) {
        for (let f of tagiD.fields) {
            if (presetsID[f] && presetsID[f].type === 'typeCombo') {

            }
            else if (/\{/.test(f)) {
                const keyRef = f.replace('{', '').replace('}', '');
                const fields = tagsID[keyRef].fields

                const newF = fields.filter(f => !idTagsFieldsListId.includes(f))
                idTagsFieldsListId = [...idTagsFieldsListId, ...newF]
                iDFields = [...iDFields, ...newF]


            } else if (!idTagsFieldsListId.includes(f)) { // TODO: add {shop} tags
                idTagsFieldsListId.push(f);
                iDFields = [...iDFields, f]
            } else {
                iDFields = [...iDFields, f]
            }
        }
    }
    if (tagiD.moreFields) {
        for (let f of tagiD.moreFields) {
            if (presetsID[f] && presetsID[f].type === 'typeCombo') {

            }
            else if (/\{/.test(f)) {
                const keyRef = f.replace('{', '').replace('}', '');
                const fields = tagsID[keyRef].moreFields
                const newF = fields.filter(f => !idTagsFieldsListId.includes(f))
                idTagsFieldsListId = [...idTagsFieldsListId, ...newF];
                iDMoreFields = [...iDMoreFields, ...newF]

            } else if (!idTagsFieldsListId.includes(f)) { // TODO: add {shop} tags
                idTagsFieldsListId.push(f);
                iDMoreFields = [...iDMoreFields, f]
            } else {
                iDMoreFields = [...iDMoreFields, f]
            }
        }
    }
    // console.log(iDFields);

    const idPkey = iDid.split('/')[0];
    const idValue = iDid.split('/')[1];

    const iDKey = tagiD.tags[idPkey];

    // let tagOsmgo = tagsOsmgo[idPkey].values.find(ogT => ogT.key == idValue);

    let tagOsmgo = tagsOsmgo[idPkey].values.find(ogT => {
        return _.isEqual(tagiD.tags, ogT.tags)

    });


    if (tagOsmgo){
        // console.log('GO' , tagOsmgo, 'iD' , tagiD);
    } else {
        console.info(tagiD);
    }
   


    // console.log(tagOsmgo);
    // not in Osm Go
    if (!tagOsmgo) {
        // console.log(idPkey, idValue);
        // new tag
        let newTag = {
            key: iDKey,
            icon: tagiD.icon || '',
            markerColor: tagsOsmgo[idPkey].values[0].markerColor,
            presets: iDFields,

            lbl: { en: tagiD.name },
            terms: { en: tagiD.terms ? tagiD.terms.join(', ') : '' },
            geometry: tagiD.geometry,
            iDRef: iDid
        }
        if (tagiD.terms) newTag['terms'] = { 'en': tagiD.terms.join(', ') };
        if (iDMoreFields.length > 0) newTag['moreFields'] = iDMoreFields
        if (tagiD.tags) newTag['tags'] = tagiD.tags;
        if (tagiD.addTags) newTag['addTags'] = tagiD.addTags;
        if (tagiD.reference) newTag['reference'] = tagiD.reference;
        if (tagiD.searchable) newTag['searchable'] = tagiD.searchable;
        

        tagsOsmgo[idPkey].values.push(newTag)

        // console.log(newTag)
        // tagsOsmgo[idPkey]


    } else {
        if (tagiD.geometry) tagOsmgo['geometry'] = tagiD.geometry;
        tagOsmgo['iDRef'] = iDid;
        if (!tagOsmgo.icon) tagOsmgo['icon'] = tagiD.icon || '';
        if (tagiD.name) tagOsmgo['lbl']['en'] = tagiD.name;
        if (tagiD.terms) {
            if (!tagOsmgo['terms']) tagOsmgo['terms'] = {};
            tagOsmgo['terms']['en'] = tagiD.terms.join(', ')
        };

        if (tagiD.tags) tagOsmgo['tags'] = tagiD.tags;
        if (tagiD.addTags) tagOsmgo['addTags'] = tagiD.addTags;
        if (tagiD.reference) tagOsmgo['reference'] = tagiD.reference;
        if (tagiD.searchable) tagOsmgo['searchable'] = tagiD.searchable;
        

        const newFieldsFromId = iDFields.filter(f => !['name', 'brand'].includes(f) && !tagOsmgo.presets.includes(f));
        tagOsmgo.presets = [...tagOsmgo.presets, ...newFieldsFromId];

        if (iDMoreFields) {
            if (!tagOsmgo.moreFields) {
                tagOsmgo['moreFields'] = iDMoreFields
            } else {
                const newMoreFields = iDMoreFields.filter(f => !['name', 'brand'].includes(f) && !tagOsmgo.moreFields.includes(f));
                tagOsmgo['moreFields'] = [...tagOsmgo['moreFields'], ...newMoreFields]
            }
        }
    }
}



/* IMPORT PRESETS */
// list des Presets/fields used : idTagsFieldsListId
// console.log(presetsID);
let types = [];

for (let fiDId of idTagsFieldsListId) {
    const currentIDPreset = presetsID[fiDId]
    let currentOsmGoPreset = presetsOsmgo[fiDId]
    if (!currentIDPreset) {
        continue;
    }

    // console.log(currentIDPreset.type)

    if (currentIDPreset.label) {
        currentIDPreset.lbl = { 'en': currentIDPreset.label }
    }

    if (currentIDPreset.options) {
        currentIDPreset.options = currentIDPreset.options.map(o => {
            return {
                "v": o,
                "lbl": { "en": o }
            }
        })
    }

    if (currentIDPreset.strings) {
        const objs = currentIDPreset.strings.options;
        const options = [];
        for (let k in objs) {
            options.push({ "v": k !== 'undefined' ? k : '', "lbl": { "en": objs[k] } })
        }
        delete currentIDPreset.strings;
        currentIDPreset['options'] = options;
        // console.log(currentIDPreset);
        // console.log(options)
    }


    if (['check', 'onewayCheck'].includes(currentIDPreset.type)) {
        const options = [
            { "v": "yes", "lbl": { "en": "yes", "fr": "Oui" } },
            { "v": "no", "lbl": { "en": "no", "fr": "Non" } }]
        currentIDPreset['iDtype'] = currentIDPreset.type;
        currentIDPreset['type'] = 'select'
        currentIDPreset['options'] = options
    }



    if (['semiCombo', 'combo', 'access'].includes(currentIDPreset.type)) {
        currentIDPreset['iDtype'] = currentIDPreset.type;
        if (currentIDPreset['options']) {
            currentIDPreset['type'] = 'list'
        } else {
            currentIDPreset['type'] = 'select'
        }
    }

    if (['wikidata', 'tel', 'email', 'adresss', 'url'].includes(currentIDPreset.type)) {
        currentIDPreset['iDtype'] = currentIDPreset.type;
        currentIDPreset['type'] = 'text'
    }

    if (['maxspeed'].includes(currentIDPreset.type)) {
        currentIDPreset['iDtype'] = currentIDPreset.type;
        currentIDPreset['type'] = 'number'
    }


    if (currentIDPreset.type == 'radio') {
        currentIDPreset['iDtype'] = currentIDPreset.type;
        currentIDPreset['type'] = 'select'

        // console.log(currentIDPreset);
    }

    delete currentIDPreset.label


    //   if (!types.includes(currentIDPreset.type)){
    //       types.push(currentIDPreset.type)
    //   }

    // already in OSMGO
    if (currentOsmGoPreset) {
        if (currentIDPreset.options) {
            for (let oiD of currentIDPreset.options) {
                //  console.log(currentOsmGoPreset);
                let oGo
                if (currentOsmGoPreset.options) {
                    oGo = currentOsmGoPreset.options.find(o => o.v === oiD.v)
                }
                if (oGo) {
                    // oGo.lbl.en = oiD.lbl.en;
                } else {
                    if (currentOsmGoPreset.options) {
                        currentOsmGoPreset.options.push(oiD)
                    }
                }
            }
            // currentOsmGoPreset.options = [...currentOsmGoPreset.options, ...currentIDPreset.options]
        }

        if (currentIDPreset && currentIDPreset.lbl && currentIDPreset.lbl.en) {
            currentOsmGoPreset.lbl.en = currentIDPreset.lbl.en
        } else {
            console.log(currentIDPreset);
        }


        // console.log('Go :', currentOsmGoPreset, 'iD:', currentIDPreset)
        currentOsmGoPreset = { ...currentIDPreset, ...currentOsmGoPreset }
    } else {
        presetsOsmgo[fiDId] = currentIDPreset
    }
}

fs.writeFileSync(tagsOsmgoPath, stringify(tagsOsmgo), 'utf8')
fs.writeFileSync(presetsOsmgoPath, stringify(presetsOsmgo), 'utf8')

