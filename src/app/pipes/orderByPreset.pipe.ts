import { Pipe } from '@angular/core'
import { TagConfig } from '@osmgo/type'

@Pipe({
    name: 'orderByPreset',
    pure: false,
})
export class OrderByPresetPipe {
    transform(items, tagConfig: TagConfig) {
        const fields = []
        const moreFields = []
        const extraTags = []
        const newFields = []
        items.forEach((element) => {
            if (element.isJustAdded) {
                newFields.push(element)
            } else if (tagConfig.presets.includes(element.key)) {
                fields.push(element)
            } else if ((tagConfig.moreFields || []).includes(element.key)) {
                moreFields.push(element)
            } else {
                extraTags.push(element)
            }
        })
        return [...fields, ...moreFields, ...extraTags, ...newFields]
    }
}
