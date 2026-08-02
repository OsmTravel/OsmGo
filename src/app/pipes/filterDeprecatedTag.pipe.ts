import { Pipe } from '@angular/core'

interface DeprecatableItem {
    deprecated?: boolean
}

@Pipe({
    name: 'filterDeprecatedTag',
    pure: false,
})
export class FilterDeprecatedTagPipe {
    transform<T extends DeprecatableItem>(items: T[] | null | undefined): T[] {
        if (!items) {
            return []
        }

        return items.filter((item) => !item.deprecated)
    }
}
