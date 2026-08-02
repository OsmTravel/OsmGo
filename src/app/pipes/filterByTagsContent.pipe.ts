import { Pipe, PipeTransform } from '@angular/core'
import type { TagConfig } from '@osmgo/type'

@Pipe({
    name: 'filterByTagsContent',
    pure: false,
})
export class FilterByTagsContentPipe implements PipeTransform {
    replaceCharSpe(text: string): string {
        if (!text) {
            return ''
        }
        return text
            .replace(/[û]/gi, 'u')
            .replace(/[áàâ]/gi, 'a')
            .replace(/[éèêë]/gi, 'e')
            .replace(/[íîï]/gi, 'i')
            .replace(/[óô]/gi, 'o')
            .replace(/ç/g, 'c')
    }

    transform(
        items: TagConfig[],
        args: string[],
        searchText: string
    ): TagConfig[] {
        const patt = new RegExp(searchText, 'i')
        const [language] = args
        if (!searchText) {
            return items
        }
        return items.filter((item) => {
            // By tags
            const tagsStr = JSON.stringify(item.tags)
            if (patt.test(tagsStr)) {
                return true
            } else if (patt.test(this.replaceCharSpe(tagsStr))) {
                return true
            }

            // By label
            if (item.lbl) {
                const labels = item.lbl as Record<string, string>
                const it = labels[language] ?? labels.en ?? ''
                if (patt.test(it)) {
                    return true
                } else if (patt.test(this.replaceCharSpe(it))) {
                    return true
                }
            }

            // By terms
            if (item.terms) {
                const terms = item.terms[language] ?? item.terms.en ?? ''
                const it = Array.isArray(terms) ? terms.join(' ') : terms
                if (patt.test(it)) {
                    return true
                } else if (patt.test(this.replaceCharSpe(it))) {
                    return true
                }
            }
            return false
        })
    }
}
