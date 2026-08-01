import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'sortArray',
    standalone: false,
})
export class SortArrayPipe implements PipeTransform {
    transform(values: any[]): any {
        return values.sort()
    }
}
