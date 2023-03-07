/**
 * Update files tags.json & presets.json in folder tagsAndPresets
 */
import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'
import isEqual from 'lodash/isEqual'
import intersection from 'lodash/intersection'
import { tapPresetsPath, tapTagsPath } from './_paths'
import { TagConfig } from '@osmgo/type'
import { readTapPresetsFromJson, readTapTagsFromJson } from './_utils'

const tagConfig = readTapTagsFromJson()
const tagsOsmgo = tagConfig.tags
const presetsOsmgo = readTapPresetsFromJson()
const tagsID = require('@openstreetmap/id-tagging-schema/dist/presets.json')
const presetsID = require('@openstreetmap/id-tagging-schema/dist/fields.json')

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

const osmgoPkeys = tagConfig.primaryKeys

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
    if (intersection(tagIDKeys, osmgoPkeys).length == 0) {
        continue
    }

    let iDFields = [] // for this tag
    let iDMoreFields = []

    // get liste of fields from current tag from iD
    let currentTagFields = []
    let currentTagMoreFields = []
    for (const f of tagiD.fields || []) {
        if (/\{/.test(f)) {
            // if field look like { ... } => reference to anothers parent fields
            const keyRef = f.replace('{', '').replace('}', '')
            const refFields = tagsID[keyRef].fields
            currentTagFields = [...currentTagFields, ...refFields]
            if (tagsID[keyRef].moreFields) {
                currentTagMoreFields = [
                    ...currentTagMoreFields,
                    ...tagsID[keyRef].moreFields,
                ]
            }
        } else {
            currentTagFields = [...currentTagFields, f]
        }
    }

    // get liste of morreFields from current tag from iD
    for (const f of tagiD.moreFields || []) {
        if (/\{/.test(f)) {
            // if field look like { ... }
            const keyRef = f.replace('{', '').replace('}', '')
            const refFields = tagsID[keyRef].fields
            currentTagMoreFields = [...currentTagMoreFields, ...refFields]
            if (tagsID[keyRef].moreFields) {
                currentTagMoreFields = [
                    ...currentTagMoreFields,
                    ...tagsID[keyRef].moreFields,
                ]
            }
        } else {
            currentTagMoreFields = [...currentTagMoreFields, f]
        }
    }

    for (let f of currentTagFields) {
        if (!presetsID[f]) {
            // Todo : if field not in presetsID, and start with {, it's a reference to another field that reference to another field...
            console.log('missing preset', f)
            continue
        }
        if (presetsID[f].type === 'typeCombo') {
            // ignore presets with type 'typeCombo'
            continue
        }

        if (!idTagsFieldsListId.includes(f)) {
            // if field not already added to list idTagsFieldsListId
            idTagsFieldsListId.push(f)
            iDFields = [...iDFields, f].filter(
                (f) => !excludesPresets.includes(f)
            )
            // Same we should use union(iDFields, [f]) instead of this filter
            continue
        }

        // Add tag
        iDFields = [...iDFields, f].filter((f) => !excludesPresets.includes(f))
    }

    for (let f of currentTagMoreFields) {
        if (presetsID[f] && presetsID[f].type === 'typeCombo') {
            // ignore presets with type 'typeCombo'
            continue
        }

        if (!idTagsFieldsListId.includes(f)) {
            // if field not already added to list idTagsFieldsListId
            idTagsFieldsListId.push(f)
            iDMoreFields = [...iDMoreFields, f].filter(
                (f) => !idTagsFieldsListId.includes(f)
            )
            // use union(iDFields, [f]) instead of this filter
            continue
        }

        // Add tag
        iDMoreFields = [...iDMoreFields, f].filter(
            (f) => !idTagsFieldsListId.includes(f)
        )
    }

    const tagOsmgoById = tagsOsmgo.find((t) => t.id === iDid)

    let currenOsmgoTag = tagsOsmgo.find((ogT) => {
        return isEqual(tagiD.tags, ogT.tags)
    })

    const rootTag = iDid.split('/')[0]

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
        let newTag: TagConfig = {
            key: undefined, // TODO: @dotcs Is this a problem? Key is required in the interface.
            id: iDid,
            tags: tagiD.tags,
            icon: tagiD.icon || '',
            markerColor: getOsmGoMarkerColorFromTagRoot(rootTag),
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

        tagsOsmgo.push(newTag)
    } else if (tagOsmgoById) {
        // tag already exist in tags.json
        // we can update tags
        tagOsmgoById.tags = tagiD.tags //why don't we force tags update?
        // TODO : rework this part. MoreFields is used on Osm Go ? May be we have to merger fields and moreFields
        // tagOsmgoById.presets = iDFields //why don't we force presets update?
        // tagOsmgoById.moreFields = iDMoreFields //why don't we force moreFields update?
    } else {
        // tagOsmgoById is null. yes it can happen
        console.log('tagOsmgoById is null for iDid=' + iDid)
    }
}

/* IMPORT PRESETS */
// list des Presets/fields used : idTagsFieldsListId

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
    } else if (
        ['semiCombo', 'combo', 'access', 'typeCombo'].includes(
            currentIDPreset.type
        )
    ) {
        currentIDPreset['iDtype'] = currentIDPreset.type
        if (currentIDPreset['options']) {
            currentIDPreset['type'] = 'list'
        } else {
            // currentIDPreset['type'] = 'select' // ? // we need to integrate options from taginfo ?
            currentIDPreset['type'] = 'text'
        }
    } else if (['tel', 'email', 'url'].includes(currentIDPreset.type)) {
        currentIDPreset['iDtype'] = currentIDPreset.type
        currentIDPreset['type'] = currentIDPreset.type
    } else if (
        ['number', 'maxspeed', 'roadheight'].includes(currentIDPreset.type)
    ) {
        currentIDPreset['iDtype'] = currentIDPreset.type
        currentIDPreset['type'] = 'number'
    } else if (currentIDPreset.type == 'radio') {
        currentIDPreset['iDtype'] = currentIDPreset.type
        currentIDPreset['type'] = 'select'
    } else if (['text'].includes(currentIDPreset.type)) {
        currentIDPreset['iDtype'] = currentIDPreset.type
        currentIDPreset['type'] = 'text'
    }
    //TODO :add type multiCombo, textarea... in Osm Go
    else {
        console.error(
            `unknown iD type : ${currentIDPreset.type}  => text in Osm Go`
        )
        currentIDPreset['iDtype'] = currentIDPreset.type
        currentIDPreset['type'] = 'text'
    }

    delete currentIDPreset.label

    // already in OSMGO
    if (currentOsmGoPreset) {
        if (currentIDPreset.options) {
            for (let oiD of currentIDPreset.options) {
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

        currentOsmGoPreset = { ...currentOsmGoPreset, ...currentIDPreset }
        presetsOsmgo[fiDId] = currentOsmGoPreset
    } else {
        presetsOsmgo[fiDId] = currentIDPreset
    }
}

fs.writeFileSync(tapTagsPath, stringify(tagConfig), 'utf8')
fs.writeFileSync(tapPresetsPath, stringify(presetsOsmgo), 'utf8')
