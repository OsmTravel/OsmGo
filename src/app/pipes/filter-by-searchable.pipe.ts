import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'filterBySearchable',
})
export class FilterBySearchablePipe implements PipeTransform {
    transform<T extends { searchable?: boolean }>(items: T[]): T[] {
        return items.filter((item) => item.searchable !== false)
    }
}
