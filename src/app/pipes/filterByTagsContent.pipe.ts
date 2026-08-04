import { Pipe, type PipeTransform } from '@angular/core'
import type { TagConfig } from '@osmgo/type'
import { includesNormalizedSearch, normalizeSearchText } from '@osmgo/utils'

@Pipe({
    name: 'filterByTagsContent',
})
export class FilterByTagsContentPipe implements PipeTransform {
    transform(
        items: TagConfig[],
        args: string[],
        searchText: string
    ): TagConfig[] {
        const query = normalizeSearchText(searchText)
        if (!query) return items
        const [language] = args
        return items.filter((item) => {
            const tagsStr = JSON.stringify(item.tags)
            const label = item.lbl?.[language] ?? item.lbl?.en ?? ''
            const localizedTerms =
                item.terms?.[language] ?? item.terms?.en ?? ''
            const terms = Array.isArray(localizedTerms)
                ? localizedTerms.join(' ')
                : localizedTerms
            return [tagsStr, label, terms].some((value) =>
                includesNormalizedSearch(value, query)
            )
        })
    }
}
