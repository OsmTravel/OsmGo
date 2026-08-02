import { Pipe } from '@angular/core'

@Pipe({
    name: 'filterByList',
})
export class FilterByListPipe {
    transform(items: Array<string>, list: Array<string>) {
        return items.filter((e) => !list.includes(e))
    }
}
