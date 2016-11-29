 import {Pipe, PipeTransform} from '@angular/core';



 @Pipe({name: 'keys'})
 export class KeysPipe implements PipeTransform {
 transform(value) {
   let keys: any = [];
   for (let key in value) {
      keys.push( {key: key, value: value[key]} );
    }
     return keys;
  }
}