import { Pipe } from '@angular/core';

@Pipe({
    name: 'filterExcludeTagByCountryCode',
    pure: false
})

export class FilterExcludeTagByCountryCode  {
    transform(items, countryCode: string) {
       
        return items.filter(item => !item.excludeCountryCodes || !item.excludeCountryCodes.includes(countryCode));
    }
}