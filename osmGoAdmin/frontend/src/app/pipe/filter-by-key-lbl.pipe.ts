import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByKeyLbl'
})
export class FilterByKeyLblPipe implements PipeTransform {

  transform(items: any[], searchText: string): any {
    if (!items) {
      return [];
    }
    if (!searchText || searchText === '') {
      return items;
    }

    searchText = searchText.toLowerCase();
    return items.filter(it => {
      const re = new RegExp(searchText, 'i');

      return re.test(it.key) || re.test(it.lbl);
    });
  }

}
