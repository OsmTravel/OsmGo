import { Pipe } from '@angular/core'
import type { TagConfig } from '@osmgo/type'

@Pipe({
    name: 'filterDeprecatedTag',
})
export class FilterDeprecatedTagPipe {
    transform(items: TagConfig[] | null | undefined): TagConfig[] {
        if (!items) {
            return []
        }

        return items.filter((item) => !item.deprecated)
    }
}
