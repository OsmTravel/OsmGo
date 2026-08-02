import { Pipe, PipeTransform } from '@angular/core'
import type { PresetOption } from '@osmgo/type'

@Pipe({
    name: 'filterByPresetsContent',
    pure: false,
})
export class FilterByPresetsContentPipe implements PipeTransform {
    replaceCharSpe(text: string): string {
        return text
            .replace(/[û]/gi, 'u')
            .replace(/[áàâ]/gi, 'a')
            .replace(/[éèêë]/gi, 'e')
            .replace(/[íîï]/gi, 'i')
            .replace(/[óô]/gi, 'o')
            .replace(/ç/g, 'c')
    }

    transform(
        items: PresetOption[],
        args: string[],
        searchText: string
    ): PresetOption[] {
        const patt = new RegExp(searchText, 'i')
        const [language] = args
        return items.filter((item) => {
            // By Key
            if (patt.test(item.v)) {
                return true
            } else if (patt.test(this.replaceCharSpe(item.v))) {
                return true
            }

            // By label ()
            if (item.lbl) {
                const it = item.lbl[language] ?? item.lbl.en ?? ''
                if (patt.test(it)) {
                    return true
                } else if (patt.test(this.replaceCharSpe(it))) {
                    return true
                }
            }

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
