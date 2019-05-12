import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByName'
})
export class FilterByNamePipe implements PipeTransform {

  transform(items: any, searchTerm?: string): any {
    if (!searchTerm || searchTerm === '') {
      return items;
    }
    const reg = RegExp(searchTerm, 'i');
    return items.filter( item => reg.test(item));
  }

}
