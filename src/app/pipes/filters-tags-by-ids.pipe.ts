import { Pipe, PipeTransform } from '@angular/core'
import { TagConfig } from '@osmgo/type'

@Pipe({
    name: 'filtersTagsByIds',
})
export class FiltersTagsByIdsPipe implements PipeTransform {
    transform(tags: TagConfig[], ids: string[], reverse = false): any {
        if (!ids) {
            return tags
        }

        let orderedTags
        if (!reverse) {
            orderedTags = new Array<TagConfig>(ids.length)
        } else {
            orderedTags = new Array<TagConfig>()
        }

        for (let i = 0; i < tags.length; i++) {
            const currentTag = tags[i]
            const currentId = currentTag.id
            const index = ids.indexOf(currentId)
            if (index !== -1 && !reverse) {
                orderedTags[index] = currentTag
            } else if (index === -1 && reverse) {
                orderedTags.push(currentTag)
            }
        }

        if (!reverse) {
            return orderedTags.filter((t) => t !== undefined)
        } else {
            return orderedTags
        }
    }
}
