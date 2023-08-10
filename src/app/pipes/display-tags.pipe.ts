import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'displayTags',
})
export class DisplayTagsPipe implements PipeTransform {
    transform(tags: any, ...args: any[]): any {
        if (!tags) {
            return
        }
        let results = []
        for (let v in tags) {
            results = [...results, `${v}=${tags[v]}`]
        }

        // console.log( tags)
        return results.join(' & ')
    }
}
