import { Pipe } from '@angular/core';

@Pipe({
    name: 'filterByCountryCode',
    pure: false
})

export class FilterByCountryCode  {
    transform(items, countryCode: string) {
        if (!items){
            return items;
        }
       
        return items.filter(item => !item.countryCodes || item.countryCodes.includes(countryCode));
    }
}