/**
 * Update files tags.json & presets.json in folder tagsAndPresets
 */

import { TagConfig } from '@osmgo/type'
import fs from 'fs'
import stringify from 'json-stringify-pretty-compact'
import intersection from 'lodash/intersection'
import isEqual from 'lodash/isEqual'
import { tapPresetsPath, tapTagsPath } from './_paths'
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
            const resultColor = result.find((r) => r.color === tag.markerColor)
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

const idTagFieldIds = new Set<string>()

const mergeFieldIds = (
    currentIds: Array<string> = [],
    importedIds: Array<string>
): Array<string> => [...new Set([...currentIds, ...importedIds])]

/* IMPORT TAGS */
for (const iDid in tagsID) {
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

    for (const f of currentTagFields) {
        if (!presetsID[f]) {
            console.log('missing preset', f)
            continue
        }
        if (presetsID[f].type === 'typeCombo' || excludesPresets.includes(f)) {
            continue
        }

        idTagFieldIds.add(f)
        iDFields = mergeFieldIds(iDFields, [f])
    }

    for (const f of currentTagMoreFields) {
        if (
            !presetsID[f] ||
            presetsID[f].type === 'typeCombo' ||
            excludesPresets.includes(f)
        ) {
            continue
        }

        idTagFieldIds.add(f)
        iDMoreFields = mergeFieldIds(iDMoreFields, [f])
    }

    const tagOsmgoById = tagsOsmgo.find((t) => t.id === iDid)

    const currenOsmgoTag = tagsOsmgo.find((ogT) => {
        return isEqual(tagiD.tags, ogT.tags)
    })

    const rootTag = iDid.split('/')[0]

    if (tagOsmgoById && !currenOsmgoTag) {
        // tag found by id, we can update tags
        console.log('!tags & sameIds', iDid)
        tagOsmgoById.tags = tagiD.tags
        tagOsmgoById.presets = mergeFieldIds(tagOsmgoById.presets, iDFields)
        tagOsmgoById.moreFields = mergeFieldIds(
            tagOsmgoById.moreFields,
            iDMoreFields
        )
        if (tagiD.addTags) {
            tagOsmgoById['addTags'] = tagiD.addTags
        }
    } else if (!tagOsmgoById && !currenOsmgoTag) {
        // new
        console.log('new', iDid)
        const newTag = {
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
        } as TagConfig
        if (tagiD.terms) newTag['terms'] = { en: tagiD.terms.join(', ') }
        if (tagiD.addTags) newTag['addTags'] = tagiD.addTags
        if (tagiD.reference) newTag['reference'] = tagiD.reference
        if (tagiD.searchable) newTag['searchable'] = tagiD.searchable

        tagsOsmgo.push(newTag)
    } else if (tagOsmgoById) {
        // tag already exist in tags.json
        // we can update tags
        tagOsmgoById.tags = tagiD.tags
        tagOsmgoById.presets = mergeFieldIds(tagOsmgoById.presets, iDFields)
        tagOsmgoById.moreFields = mergeFieldIds(
            tagOsmgoById.moreFields,
            iDMoreFields
        )
    } else {
        // tagOsmgoById is null. yes it can happen
        console.log('tagOsmgoById is null for iDid=' + iDid)
    }
}

/* IMPORT PRESETS */
// list des Presets/fields used : idTagsFieldsListId

for (const fiDId of idTagFieldIds) {
    if (excludesPresets.includes(fiDId)) {
        continue
    }
    const currentIDPreset = structuredClone(presetsID[fiDId])
    let currentOsmGoPreset = presetsOsmgo[fiDId]
    if (!currentIDPreset) {
        continue
    }

    if (currentIDPreset.label) {
        currentIDPreset.lbl = { en: currentIDPreset.label }
    }

    if (
        !currentIDPreset.options &&
        currentIDPreset.key &&
        currentIDPreset.type === 'radio'
    ) {
        const matchingField = Object.values(presetsID).find((field: any) => {
            return (
                field !== presetsID[fiDId] &&
                field.key === currentIDPreset.key &&
                Array.isArray(field.options)
            )
        }) as { options?: Array<string> } | undefined
        currentIDPreset.options = matchingField?.options
    }

    if (currentIDPreset.options) {
        currentIDPreset.options = currentIDPreset.options.map((o) => {
            return {
                v: o === 'undefined' ? '' : o,
                lbl: { en: o },
            }
        })
    }

    if (currentIDPreset.strings) {
        const objs = currentIDPreset.strings.options
        const options = []
        for (const k in objs) {
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
            for (const oiD of currentIDPreset.options) {
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
