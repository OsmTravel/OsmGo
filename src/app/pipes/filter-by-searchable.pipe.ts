import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'filterBySearchable',
})
export class FilterBySearchablePipe implements PipeTransform {
    transform(items: any): any {
        return items.filter((item) => {
            if (item.searchable === undefined || item.searchable !== false) {
                return true
            }
        })
    }
}
