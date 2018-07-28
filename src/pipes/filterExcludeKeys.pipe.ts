import {Pipe} from '@angular/core';

@Pipe({
    name: 'filterExcludeKeys',
    pure: false
})

export class FilterExcludeKeysPipe{
    transform(items, excludeKeys: string[]) {
        if (excludeKeys)
        return items.filter(item => excludeKeys.indexOf(item.key) === -1);
    }
}