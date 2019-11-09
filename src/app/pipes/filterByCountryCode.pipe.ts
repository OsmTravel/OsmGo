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
       
        return items.filter(item => {
           return  !item.countryCodes || item.countryCodes.map( o=> o.toUpperCase()).includes(countryCode)
        });
    }
}