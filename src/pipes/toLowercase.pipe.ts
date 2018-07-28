import { Pipe } from '@angular/core';

@Pipe({
    name: 'lowercase',
    pure: false
})

export class ToLowercasePipe {
    transform(text: string) {
        if (text)
            return text.toLowerCase();
    }
}