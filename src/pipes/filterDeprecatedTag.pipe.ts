import { Pipe } from '@angular/core';

@Pipe({
    name: 'filterDeprecatedTag',
    pure: false
})

export class FilterDeprecatedTagPipe  {
    transform(items, keys: string[]) {
        return items.filter(item => {
           if (!item.deprecated){
               return true
           }
        });

    }
}