import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterByContent',
    pure: false
})

export class FilterByContentPipe implements PipeTransform {
    transform(items, keys: string[], searchText: string) {
        let patt = new RegExp(searchText, 'i');
 
        return items.filter(item => {
            for (let i = 0; i < keys.length; i++) {
                if (patt.test(item[keys[i]])) {
                    return true;
                } else if (  patt.test(item[keys[i]].replace(/[û]/g, 'u')
                        .replace(/[áàâ]/g, 'a')
                        .replace(/[éèê]/g, 'e')
                        .replace(/[íîï]/g, 'i')
                        .replace(/[óô]/g, 'o')
                        .replace(/ç/g, 'c'))) {
                    return true;
                }
            }
        });

    }
}