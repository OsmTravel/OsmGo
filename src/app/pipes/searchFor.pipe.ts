import { Pipe } from '@angular/core'
import { Preset } from '@osmgo/type'
import {
    includesNormalizedSearch,
    nameToOsmKey,
    normalizeSearchText,
    osmTagKeyToPresetId,
    presetIdMatchesQuery,
} from '@osmgo/utils'

@Pipe({
    name: 'searchFor',
})
export class SearchForPipe {
    transform(items: Array<Preset>, name: string, language: string) {
        const key = osmTagKeyToPresetId(nameToOsmKey(name))
        const query = normalizeSearchText(name)
        return items.filter((e) => {
            if (key && key === e._id) return false
            if (presetIdMatchesQuery(e._id, key)) return true
            const searchableId = e._id.replace(/[/:_-]+/g, ' ')
            return [searchableId, e.lbl[language] ?? e.lbl.en ?? ''].some(
                (value) => includesNormalizedSearch(value, query)
            )
        })
    }
}
