import { Pipe } from '@angular/core'
import { Preset } from '@osmgo/type'
import { nameToOsmKey } from '@osmgo/utils'

@Pipe({
    name: 'searchFor',
    pure: false,
})
export class SearchForPipe {
    transform(items: Array<Preset>, name: string, language: string) {
        const key = nameToOsmKey(name)
        return items.filter((e) => {
            if (key == e._id) return false
            if (e._id.includes(key)) return true
            if (
                (e.lbl[language] || '')
                    .toLowerCase()
                    .includes(name.toLowerCase())
            )
                return true
            return false
        })
    }
}
