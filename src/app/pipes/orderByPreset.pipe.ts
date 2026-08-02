import { Pipe } from '@angular/core'
import type { Tag, TagConfig } from '@osmgo/type'

@Pipe({
    name: 'orderByPreset',
})
export class OrderByPresetPipe {
    transform(items: Tag[], tagConfig: TagConfig): Tag[] {
        const fields: Tag[] = []
        const moreFields: Tag[] = []
        const extraTags: Tag[] = []
        const newFields: Tag[] = []
        items.forEach((element: Tag) => {
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
