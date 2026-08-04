import { Pipe, type PipeTransform } from '@angular/core'

@Pipe({
    name: 'sortArray',
})
export class SortArrayPipe implements PipeTransform {
    transform(values: any[]): any {
        return [...values].sort()
    }
}
