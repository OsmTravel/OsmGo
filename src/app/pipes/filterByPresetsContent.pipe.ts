import { Pipe, PipeTransform } from '@angular/core'
import type { PresetOption } from '@osmgo/type'
import { includesNormalizedSearch, normalizeSearchText } from '@osmgo/utils'

@Pipe({
    name: 'filterByPresetsContent',
})
export class FilterByPresetsContentPipe implements PipeTransform {
    transform(
        items: PresetOption[],
        args: string[],
        searchText: string
    ): PresetOption[] {
        const query = normalizeSearchText(searchText)
        if (!query) return items
        const [language] = args
        return items.filter((item) => {
            const label = item.lbl?.[language] ?? item.lbl?.en ?? ''
            const localizedTerms =
                item.terms?.[language] ?? item.terms?.en ?? ''
            const terms = Array.isArray(localizedTerms)
                ? localizedTerms.join(' ')
                : localizedTerms
            return [item.v, label, terms].some((value) =>
                includesNormalizedSearch(value, query)
            )
        })
    }
}
