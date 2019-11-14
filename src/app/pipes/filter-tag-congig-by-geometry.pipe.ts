import { Pipe, PipeTransform } from '@angular/core';
import { TagConfig } from 'src/type';

@Pipe({
  name: 'filterTagCongigByGeometry'
})
export class FilterTagCongigByGeometryPipe implements PipeTransform {

  transform(tagsConfig: TagConfig[], geometries : string[]): any {
    if (!geometries || geometries.length == 0){
      return tagsConfig
    }

    const filteredTags = tagsConfig.filter( tc => {

      if (!tc.geometry){
        return true
      }
      for (let g of geometries){
        if ( tc.geometry.includes(g)){
          return true;
        }
      }

      return false
    })
    return filteredTags;
  }

}
