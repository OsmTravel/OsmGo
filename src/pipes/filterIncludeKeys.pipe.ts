import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
    name: 'filterIncludeKeys',
    pure: false
})

export class FilterIncludeKeysPipe implements PipeTransform {
    transform(items, includeKeys: string[]) {
        if (includeKeys)
            return items.filter(item => includeKeys.indexOf(item.key) !== -1);
    }
}