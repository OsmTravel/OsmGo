import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
    name: 'lowercase',
    pure: false
})

export class ToLowercasePipe implements PipeTransform {
    transform(text:string) {
        if (text)
         return text.toLowerCase();
    }
}