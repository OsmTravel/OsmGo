import {Pipe} from '@angular/core';

@Pipe({
    name: 'filterIncludeKeys',
    pure: false
})

export class FilterIncludeKeysPipe {
    transform(items, includeKeys: string[]) {
        if (includeKeys)
            return items.filter(item => includeKeys.indexOf(item.key) !== -1);
    }
}