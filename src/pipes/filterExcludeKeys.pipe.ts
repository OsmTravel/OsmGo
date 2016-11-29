import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
    name: 'filterExcludeKeys',
    pure: false
})

export class FilterExcludeKeysPipe implements PipeTransform {
    transform(items, excludeKeys: string[]) {
        if (excludeKeys)
        return items.filter(item => excludeKeys.indexOf(item.key) === -1);
    }
}