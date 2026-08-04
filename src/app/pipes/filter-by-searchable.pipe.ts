import { Pipe, type PipeTransform } from '@angular/core'
import type { TagConfig } from '@osmgo/type'

@Pipe({
    name: 'filterBySearchable',
})
export class FilterBySearchablePipe implements PipeTransform {
    transform(items: TagConfig[]): TagConfig[] {
        return items.filter((item) => item.searchable !== false)
    }
}
