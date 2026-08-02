import { Pipe } from '@angular/core'

interface CountryExclusionItem {
    excludeCountryCodes?: string[]
}

@Pipe({
    name: 'filterExcludeTagByCountryCode',
    pure: false,
})
export class FilterExcludeTagByCountryCode {
    transform<T extends CountryExclusionItem>(
        items: T[],
        countryCode: string
    ): T[] {
        return items.filter(
            (item) =>
                !item.excludeCountryCodes ||
                !item.excludeCountryCodes.includes(countryCode)
        )
    }
}
