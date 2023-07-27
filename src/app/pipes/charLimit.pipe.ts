import { Pipe } from '@angular/core'

@Pipe({
    name: 'charLimit',
    pure: false,
})
export class CharLimitPipe {
    transform(string, charNumber) {
        return string.substring(0, charNumber)
    }
}
