/**
 * Update files tags.json & presets.json in folder tagsAndPresets
 */
import path from 'path'
import fs from 'fs'
import chalk from 'chalk'
import stringify from 'json-stringify-pretty-compact'
import { assetsDir, idtsTagsIdPath, tapTagsPath } from './_paths'
import { readTapTagsFromJson } from './_utils'

// OsmGo tags
const tagConfig = readTapTagsFromJson()
const tagsOsmgo = tagConfig.tags

// OsmGo sprites
const spritesPath = path.join(assetsDir, 'iconsSprites@x1.json')
const sprites = JSON.parse(fs.readFileSync(spritesPath, 'utf8'))
const supportedIcons = Object.keys(sprites)

// id-tagging-schema
const tagsID = JSON.parse(fs.readFileSync(idtsTagsIdPath, 'utf8'))

// tagsToIgnore because OsmGo icon is better than id icon
const tagsToIgnore: string[] = [
    'amenity/atm',
    'amenity/coworking_space',
    'amenity/nursing_home',
    'amenity/clinic',
    'amenity/clinic/abortion',
    'amenity/clinic/fertility',
    'amenity/clock',
    'amenity/community_centre',
    'amenity/fast_food',
    'amenity/fire_station',
    'amenity/hospital',
    'amenity/kindergarten',
    'amenity/language_school',
    'amenity/marketplace',
    'amenity/monastery',
    'amenity/parking',
    'amenity/place_of_worship',
    'amenity/public_bookcase',
    'amenity/recycling_centre',
    'amenity/recycling_container',
    'amenity/recycling/container/electrical_items',
    'amenity/recycling/container/green_waste',
    'amenity/shelter',
    'amenity/social_facility',
    'amenity/ticket_validator',
    'amenity/toilets/disposal/pitlatrine',
    'amenity/vehicle_inspection',
    'amenity/watering_place',
    'attraction/water_slide',
    'craft/locksmith',
    'craft/brewery',
    'craft/clockmaker',
    'craft/distillery',
    'craft/electrician',
    'healthcare/alternative',
    'healthcare/alternative/chiropractic',
    'healthcare/audiologist',
    'healthcare/occupational_therapist',
    'healthcare/podiatrist',
    'healthcare/psychotherapist',
    'healthcare/rehabilitation',
    'historic/building',
    'leisure/bird_hide',
    'leisure/fishing',
    'leisure/garden',
    'leisure/nature_reserve',
    'leisure/pitch',
    'leisure/sports_centre',
    'leisure/slipway',
    'leisure/stadium',
    'man_made/cross',
    'man_made/flagpole',
    'man_made/monitoring_station',
    'office/administrative',
    'office/travel_agent',
    'office/yes',
    'office/it',
    'office/research',
    'office/water_utility',
    'shop/yes',
    'shop/boutique',
    'shop/fashion',
    'shop/vacant',
    'shop/art',
    'shop/car',
    'shop/charity',
    'shop/clothes',
    'shop/department_store',
    'shop/electrical',
    'shop/frozen_food',
    'shop/funeral_directors',
    'shop/general',
    'shop/interior_decoration',
    'shop/mall',
    'shop/model',
    'shop/outdoor',
    'shop/second_hand',
    'shop/trade',
    'shop/variety_store',
    'tourism/artwork',
    'tourism/gallery',
    'tourism/theme_park',
]
const notworkingIcons = []
const unsupportedIcons = []
const updatedTags = []

/* IMPORT TAGS */
for (const iDid in tagsID) {
    const tagiD = tagsID[iDid]
    const tagOsmgoById = tagsOsmgo.find((t) => t.id === iDid)

    if (tagOsmgoById) {
        if (tagOsmgoById.icon && !supportedIcons.includes(tagOsmgoById.icon)) {
            notworkingIcons.push(tagOsmgoById)
        }
        if (tagsToIgnore.includes(tagOsmgoById.id)) {
            continue
        }
        if (tagiD.icon) {
            if (supportedIcons.includes(tagiD.icon)) {
                if (tagOsmgoById.icon !== tagiD.icon) {
                    let oldicon = tagOsmgoById.icon
                    tagOsmgoById.icon = tagiD.icon
                    let clone = Object.assign(
                        { oldicon: oldicon },
                        tagOsmgoById
                    )
                    clone.oldicon = oldicon
                    updatedTags.push(clone)
                }
            } else {
                unsupportedIcons.push(tagiD.icon)
            }
        }
    }
}

fs.writeFileSync(tapTagsPath, stringify(tagConfig), 'utf8')

console.warn('iD icons not supported by OsmGo: ' + unsupportedIcons.length)
console.warn('Icons not working in OsmGo: ' + notworkingIcons.length)
for (const itag in notworkingIcons) {
    const tag = notworkingIcons[itag]
    console.warn('not working: ' + tag.id + ' => ' + tag.icon)
}
console.log('Icons updated in OsmGo tags: ' + updatedTags.length)
for (const itag in updatedTags) {
    const tag = updatedTags[itag]
    console.log(
        'updated: ' +
            chalk.yellow(tag.id) +
            ' icon: ' +
            chalk.red(tag.oldicon) +
            ' => ' +
            chalk.green(tag.icon)
    )
}
