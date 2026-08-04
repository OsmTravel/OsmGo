import { Pipe } from '@angular/core'
import type { Preset } from '@osmgo/type'

@Pipe({
    name: 'filterPresetsByList',
})
export class FilterPresetsByListPipe {
    transform(items: Array<Preset>, list: Array<string>) {
        return items.filter((e) => !list.includes(e._id))
    }
}
