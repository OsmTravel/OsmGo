import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'limitDisplayTags',
    standalone: false,
})
export class LimitDisplayTagsPipe implements PipeTransform {
    transform(items: any[], limit: number): any {
        if (!limit) {
            return items
        }

        return items.slice(0, limit)
    }
}
