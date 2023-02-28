import { Pipe } from '@angular/core'
import { TagConfig } from '@osmgo/type'

@Pipe({
    name: 'orderByPreset',
    pure: false,
})
export class OrderByPresetPipe {
    transform(items, tagConfig: TagConfig) {
        let fields = []
        let moreFields = []
        let extraTags = []
        items.forEach((element) => {
            if (tagConfig.presets.includes(element.key)) {
                fields.push(element)
            } else if ((tagConfig.moreFields || []).includes(element.key)) {
                moreFields.push(element)
            } else {
                extraTags.push(element)
            }
        })
        return [...fields, ...moreFields, ...extraTags]
    }
}
