import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'keys'
})
export class KeyPipe implements PipeTransform {

  transform(value: any, args: any[] = null): any {
    if (!value) {
      return [];
    }
    return Object.keys(value);
  }

}
