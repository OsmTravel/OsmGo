import { readTapTagsFromJson } from './_utils'

const tagConfig = readTapTagsFromJson()
const tagsOsmgo = tagConfig.tags

const exludesIds: string[] = []
for (let tag of tagsOsmgo) {
    const id = tag.id
    const pk = id.split('/')[0]
    if (pk == 'barrier') {
        // if (tag.geometry.includes('point') || tag.geometry.includes('vertex')){

        // } else {
        console.log(tag.geometry)
        exludesIds.push(id)
        // }
    }
    // console.log(pk);
}
console.log(exludesIds)
