import { Pipe } from '@angular/core'
import type { TagConfig } from '@osmgo/type'

@Pipe({
    name: 'filterExcludeTagByCountryCode',
})
export class FilterExcludeTagByCountryCode {
    transform(items: TagConfig[], countryCode: string): TagConfig[] {
        return items.filter(
            (item) =>
                !item.excludeCountryCodes ||
                !item.excludeCountryCodes.includes(countryCode)
        )
    }
}
