import { Pipe } from '@angular/core'
import type { PresetOption } from '@osmgo/type'

@Pipe({
    name: 'filterByCountryCode',
    pure: false,
})
export class FilterByCountryCode {
    transform(
        items: PresetOption[] | null | undefined,
        countryCode: string
    ): PresetOption[] {
        if (!items) {
            return []
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
