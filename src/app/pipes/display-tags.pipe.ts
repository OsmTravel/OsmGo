import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'displayTags',
})
export class DisplayTagsPipe implements PipeTransform {
    transform(
        tags: Record<
            string,
            string | number | boolean | null | undefined
        > | null
    ): string | undefined {
        if (!tags) {
            return
        }
        const results: string[] = []
        for (const v in tags) {
            results.push(`${v}=${tags[v]}`)
        }

        return results.join(' & ')
    }
}
