import { Pipe } from '@angular/core'

@Pipe({
    name: 'filterByList',
    pure: false,
    standalone: false,
})
export class FilterByListPipe {
    transform(items: Array<string>, list: Array<string>) {
        return items.filter((e) => !list.includes(e))
    }
}
