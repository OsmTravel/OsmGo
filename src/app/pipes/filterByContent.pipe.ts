import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterByContent',
    pure: false
})

export class FilterByContentPipe implements PipeTransform  {
    transform(items, keys: string[], searchText: string) {
        const patt = new RegExp(searchText, 'i');
        console.log(items)
        console.log(keys)

        return items.filter(item => {
            for (let i = 0; i < keys.length; i++) {
                if (!item[keys[i]]) {
                    return false
                }

                if (patt.test(item[keys[i]])) {
                    return true;
                } else if (  patt.test(item[keys[i]]
                        .replace(/[û]/gi, 'u')
                        .replace(/[áàâ]/gi, 'a')
                        .replace(/[éèêë]/gi, 'e')
                        .replace(/[íîï]/gi, 'i')
                        .replace(/[óô]/gi, 'o')
                        .replace(/ç/g, 'c'))) {
                    return true;
                }
            }
        });

    }
}
