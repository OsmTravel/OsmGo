/**
 * Update files tags.json & presets.json in folder tagsAndPresets
 */
const path = require('path')
const fs = require('fs')
const stringify = require('json-stringify-pretty-compact')

const _ = require('lodash')

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tagsAndPresets', 'tags.json')
const presetsOsmgoPath = path.join(
    assetsFolder,
    'tagsAndPresets',
    'presets.json'
)

const idRepoPath = path.join(__dirname, '..', '..', 'id-tagging-schema', 'dist')
const tagsIDPath = path.join(idRepoPath, 'presets.json')
const presetsIDPath = path.join(idRepoPath, 'fields.json')

const tagConfig = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'))
const tagsOsmgo = tagConfig.tags
const presetsOsmgo = JSON.parse(fs.readFileSync(presetsOsmgoPath, 'utf8'))

const tagsID = JSON.parse(fs.readFileSync(tagsIDPath, 'utf8'))

const presetsID = JSON.parse(fs.readFileSync(presetsIDPath, 'utf8'))

// presets to ignore
const excludesPresets = [
    //'access_simple', to add?
    'address',
    //'branch_brand', to add?
    'brand',
    'building_area',
    //'charge_fee', to add?
    //'gnis/feature_id-US', to add?
    'gnis/feature_id',
    //'mimics', to add?
    'name',
    //'not/name', to add?
    //'opening_hours/covid19', to add?
    'operator',
    //'portable', to add?
    'post',
    //'real_fire-GB-IE', to add?
    'recycling_accepts',
    //'ref', to add?
    //'ref/vatin', to add?
    //'visibility', to add?
    'level_semi',
]

// const osmgoPkeys = Object.keys(tagsOsmgo);

const osmgoPkeys = tagConfig.primaryKeys

// Primary keys to ignore. This list is extracted from misings pk in OsmGo 1.5
// I commented some pk that we can 'may be' add in OsmGo 1.6
const pkToIgnore = [
    'addr',
    'address',
    'allotments',
    'area',
    'boundary',
    // 'bridge' OsmGo 1.6 adding bridges
    'building_point',
    'cycleway',
    'demolished',
    //'disc_golf', OsmGo 1.6 adding disc_golf
    'disused',
    //'embankment', OsmGo 1.6 adding embankment
    'ford',
    'ford_line',
    //'golf', OsmGo 1.6 adding golf
    'indoor',
    //'internet_access', OsmGo 1.6 adding internet_access
    'junction',
    'landuse',
    'line',
    'marker',
    'network',
    'noexit',
    'point',
    'relation',
    'route',
    'traffic_calming',
    'traffic_sign',
    'type',
]

function getPk(tag) {
    return tag.split('/')[0]
}

function isPkToIgnore(tag) {
    return pkToIgnore.includes(tag)
}

function isPresetToIgnore(tag) {
    return excludesPresets.includes(tag)
}

// Import primary keys from id-tagging-schema
/* Code to use to get PK from id-tagging-schema instead of getting current pk in OsmGo
let osmgoPkeys = [];
for (let t in tagsID) {
    const iDid = t; 
    const pk = getPk(iDid)
    if (!isPkToIgnore(pk)) {
        // insert the key without creating dulicate
        osmgoPkeys = _.union(osmgoPkeys, [pk]);
    } 
}
osmgoPkeys = osmgoPkeys.sort();
// Store new pk in osmgo pklist
tagConfig.primaryKeys = osmgoPkeys;
*/

const getOsmGoMarkerColorFromTagRoot = (tagRoot) => {
    let result = [] // =>
    for (const tag of tagsOsmgo) {
        const currentTagRoot = tag.id.split('/')[0]
        if (currentTagRoot === tagRoot) {
            let resultColor = result.find((r) => r.color === tag.markerColor)
            if (resultColor) {
                resultColor.count = resultColor.count + 1
            } else {
                result = [...result, { color: tag.markerColor, count: 1 }]
            }
        }
    }
    // take object with the max count
    let maxCountColor
    for (const r of result) {
        if (!maxCountColor || maxCountColor.count < r.count) {
            maxCountColor = r
        }
    }
    return maxCountColor.color || '{CHANGE_ME}'
}

getOsmGoMarkerColorFromTagRoot('natural')

let idTagsFieldsListId = [] // list of id of fields to add...

/* IMPORT TAGS */
for (let iDid in tagsID) {
    const tagiD = tagsID[iDid]
    const tagIDKeys = Object.keys(tagiD.tags)

    if (iDid.split('/').length === 1) {
        // primary key
        continue
    }

    if (iDid.split('/')[0] == 'type') {
        continue
    }

    // exclude brands...
    //TODO rework
    if (tagiD['addTags'] && tagiD['addTags']['brand']) {
        continue
    }

    //TODO rework
    if (_.intersection(tagIDKeys, osmgoPkeys).length == 0) {
        continue
    }

    let iDFields = [] // for this tag
    let iDMoreFields = []

    if (tagiD.fields) {
        for (let f of tagiD.fields) {
            if (presetsID[f] && presetsID[f].type === 'typeCombo') {
                // ignore presets with type 'typeCombo'
                continue
            }

            if (/\{/.test(f)) {
                // if field look like { ... }
                const keyRef = f.replace('{', '').replace('}', '')
                const fields = tagsID[keyRef].fields

                const newF = fields.filter(
                    (f) => !idTagsFieldsListId.includes(f)
                )
                idTagsFieldsListId = [...idTagsFieldsListId, ...newF]
                iDFields = [...iDFields, ...newF].filter(
                    (f) => !excludesPresets.includes(f)
                )
                // We should use _.union(iDFields, newF) instead of doing this filter
                // Code is more readable with _.union
                continue
            }

            if (!idTagsFieldsListId.includes(f)) {
                // if field not already added to list idTagsFieldsListId
                // TODO: add {shop} tags
                idTagsFieldsListId.push(f)
                iDFields = [...iDFields, f].filter(
                    (f) => !excludesPresets.includes(f)
                )
                // Same we should use _.union(iDFields, [f]) instead of this filter
                continue
            }

            // Add tag
            iDFields = [...iDFields, f].filter(
                (f) => !excludesPresets.includes(f)
            )
        }
    }

    if (tagiD.moreFields) {
        for (let f of tagiD.moreFields) {
            if (presetsID[f] && presetsID[f].type === 'typeCombo') {
                // ignore presets with type 'typeCombo'
                continue
            }

            if (/\{/.test(f)) {
                // if field look like { ... }
                const keyRef = f.replace('{', '').replace('}', '')
                const fields = tagsID[keyRef].moreFields
                const newF = fields.filter(
                    (f) => !idTagsFieldsListId.includes(f)
                )
                idTagsFieldsListId = [...idTagsFieldsListId, ...newF]
                iDMoreFields = [...iDMoreFields, ...newF].filter(
                    (f) => !idTagsFieldsListId.includes(f)
                )
                // use _.union(iDFields, newF) instead of doing this filter
                continue
            }

            if (!idTagsFieldsListId.includes(f)) {
                // if field not already added to list idTagsFieldsListId
                // TODO: add {shop} tags
                idTagsFieldsListId.push(f)
                iDMoreFields = [...iDMoreFields, f].filter(
                    (f) => !idTagsFieldsListId.includes(f)
                )
                // use _.union(iDFields, [f]) instead of this filter
                continue
            }

            // Add tag
            iDMoreFields = [...iDMoreFields, f].filter(
                (f) => !idTagsFieldsListId.includes(f)
            )
        }
    }

    const tagOsmgoById = tagsOsmgo.find((t) => t.id === iDid)

    let currenOsmgoTag = tagsOsmgo.find((ogT) => {
        return _.isEqual(tagiD.tags, ogT.tags)
    })

    let newTag = {
        id: iDid,
        tags: tagiD.tags,
        icon: tagiD.icon || '',
        markerColor: '{CHANGE_ME}',
        presets: iDFields,
        moreFields: iDMoreFields,
        lbl: { en: tagiD.name },
        terms: { en: tagiD.terms ? tagiD.terms.join(', ') : '' },
        geometry: tagiD.geometry,
        iDRef: iDid,
    }
    if (tagiD.terms) newTag['terms'] = { en: tagiD.terms.join(', ') }
    if (tagiD.addTags) newTag['addTags'] = tagiD.addTags
    if (tagiD.reference) newTag['reference'] = tagiD.reference
    if (tagiD.searchable) newTag['searchable'] = tagiD.searchable

    if (tagOsmgoById && !currenOsmgoTag) {
        // tag found by id, we can update tags
        console.log('!tags & sameIds', iDid)
        tagOsmgoById.tags = tagiD.tags
        //tagOsmgoById.presets = iDFields; why don't we force presets update?
        //tagOsmgoById.moreFields = iDMoreFields; why don't we force moreFields update?
        if (tagiD.addTags) {
            tagOsmgoById['addTags'] = tagiD.addTags
        }
    } else if (!tagOsmgoById && !currenOsmgoTag) {
        // new
        console.log('new', iDid)
        const rootTag = iDid.split('/')[0]
        newTag.markerColor = getOsmGoMarkerColorFromTagRoot(rootTag)
        tagsOsmgo.push(newTag)
    } else if (tagOsmgoById) {
        // tag already exist in tags.json
        // we can update tags
        //tagOsmgoById.tags = tagiD.tags; why don't we force tags update?
        //tagOsmgoById.presets = iDFields why don't we force presets update?
        //tagOsmgoById.moreFields = iDMoreFields why don't we force moreFields update?
    } else {
        // tagOsmgoById is null. yes it can happen
        console.log('tagOsmgoById is null for iDid=' + iDid)
    }
}

/* IMPORT PRESETS */
// list des Presets/fields used : idTagsFieldsListId
// console.log(presetsID);
let types = []
for (let fiDId of idTagsFieldsListId) {
    if (excludesPresets.includes(fiDId)) {
        continue
    }
    const currentIDPreset = presetsID[fiDId]
    let currentOsmGoPreset = presetsOsmgo[fiDId]
    if (!currentIDPreset) {
        continue
    }

    if (currentIDPreset.label) {
        currentIDPreset.lbl = { en: currentIDPreset.label }
    }

    if (currentIDPreset.options) {
        currentIDPreset.options = currentIDPreset.options.map((o) => {
            return {
                v: o,
                lbl: { en: o },
            }
        })
    }

    if (currentIDPreset.strings) {
        const objs = currentIDPreset.strings.options
        const options = []
        for (let k in objs) {
            options.push({
                v: k !== 'undefined' ? k : '',
                lbl: { en: objs[k] },
            })
        }
        delete currentIDPreset.strings
        currentIDPreset['options'] = options
    }

    if (['check', 'onewayCheck'].includes(currentIDPreset.type)) {
        const options = [
            { v: 'yes', lbl: { en: 'yes', fr: 'Oui' } },
            { v: 'no', lbl: { en: 'no', fr: 'Non' } },
        ]
        currentIDPreset['iDtype'] = currentIDPreset.type
        currentIDPreset['type'] = 'select'
        currentIDPreset['options'] = options
    }

    if (['semiCombo', 'combo', 'access'].includes(currentIDPreset.type)) {
        currentIDPreset['iDtype'] = currentIDPreset.type
        if (currentIDPreset['options']) {
            currentIDPreset['type'] = 'list'
        } else {
            currentIDPreset['type'] = 'select'
        }
    }

    if (['wikidata', 'adresss'].includes(currentIDPreset.type)) {
        currentIDPreset['iDtype'] = currentIDPreset.type
        currentIDPreset['type'] = 'text'
    }
    if (['tel', 'email', 'url'].includes(currentIDPreset.type)) {
        currentIDPreset['iDtype'] = currentIDPreset.type
        currentIDPreset['type'] = currentIDPreset.type
    }

    if (['maxspeed'].includes(currentIDPreset.type)) {
        currentIDPreset['iDtype'] = currentIDPreset.type
        currentIDPreset['type'] = 'number'
    }

    if (currentIDPreset.type == 'radio') {
        currentIDPreset['iDtype'] = currentIDPreset.type
        currentIDPreset['type'] = 'select'
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
                    oGo = currentOsmGoPreset.options.find((o) => o.v === oiD.v)
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
            // console.log(currentIDPreset);
        }

        currentOsmGoPreset = { ...currentIDPreset, ...currentOsmGoPreset }
    } else {
        presetsOsmgo[fiDId] = currentIDPreset
    }
}

// //  delete presets keys
// for (let tag of tagConfig.tags){
//     tag.presets = tag.presets.filter(f => !excludesPresets.includes(f))
//     if (tag.moreFields){
//         tag.moreFields = tag.moreFields.filter(f => !excludesPresets.includes(f))
//     }
// }

const compareById = (a, b) => {
    // Use toUpperCase() to ignore character casing
    const idA = a.id
    const idB = b.id

    let comparison = 0
    if (idA > idB) {
        comparison = 1
    } else if (idA < idB) {
        comparison = -1
    }
    return comparison
}

fs.writeFileSync(tagsOsmgoPath, stringify(tagConfig), 'utf8')
fs.writeFileSync(presetsOsmgoPath, stringify(presetsOsmgo), 'utf8')
