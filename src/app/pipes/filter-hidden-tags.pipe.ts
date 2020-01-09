import { Pipe, PipeTransform } from '@angular/core';
import { TagConfig } from 'src/type';

@Pipe({
  name: 'filterHiddenTags'
})
export class FilterHiddenTagsPipe implements PipeTransform {

  transform(tags : TagConfig[], hiddenTags: string[], invertFilter = false): any {
    if (!hiddenTags){
      hiddenTags = [];
    }
    if (invertFilter){
      return tags.filter(t => hiddenTags.includes(t.id) )
    } else {
      return tags.filter(t => !hiddenTags.includes(t.id) )
    }
  }

}
