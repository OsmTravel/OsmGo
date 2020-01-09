import { Pipe, PipeTransform } from '@angular/core';
import { TagConfig } from 'src/type';

@Pipe({
  name: 'filterBookmarkedTags'
})
export class FilterBookmarkedTagsPipe implements PipeTransform {

  transform(tags : TagConfig[], bookmarksIds: string[]): any {
    if (!bookmarksIds){
      bookmarksIds = [];
    }
      return tags.filter(t => bookmarksIds.includes(t.id) )

  }

}
