import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
    name: 'filterNull',
    pure: false
})

export class FilterNullValuePipe implements PipeTransform {
    transform(items) {
        if (items)
         return items.filter(item => (item.value && item.value !== '' ));
    }
}