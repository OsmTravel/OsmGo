import { Pipe } from '@angular/core'

@Pipe({
    name: 'charLimit',
})
export class CharLimitPipe {
    transform(value: string, characterCount: number): string {
        return value.substring(0, characterCount)
    }
}
