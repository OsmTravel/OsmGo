import { Pipe } from '@angular/core'

interface CountrySpecificItem {
    countryCodes?: string[]
}

@Pipe({
    name: 'filterByCountryCode',
    pure: false,
})
export class FilterByCountryCode {
    transform<T extends CountrySpecificItem>(
        items: T[] | null | undefined,
        countryCode: string
    ): T[] | null | undefined {
        if (!items) {
            return items
        }

        return items.filter(
            (item) =>
                !item.countryCodes ||
                item.countryCodes
                    .map((code) => code.toUpperCase())
                    .includes(countryCode)
        )
    }
}
