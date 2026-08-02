import { Pipe } from '@angular/core'

@Pipe({
    name: 'charLimit',
    pure: false,
})
export class CharLimitPipe {
    transform(value: string, characterCount: number): string {
        return value.substring(0, characterCount)
    }
}
