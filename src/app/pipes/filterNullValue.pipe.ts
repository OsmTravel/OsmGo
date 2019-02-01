import {Pipe} from '@angular/core';

@Pipe({
    name: 'filterNull',
    pure: false
})

export class FilterNullValuePipe {
    transform(items) {
        if (items)
         return items.filter(item => (item.value && item.value !== '' ));
    }
}