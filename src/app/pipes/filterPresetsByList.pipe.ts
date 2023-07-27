import { Pipe } from '@angular/core'
import { Preset } from '@osmgo/type'

@Pipe({
    name: 'filterPresetsByList',
    pure: false,
})
export class FilterPresetsByListPipe {
    transform(items: Array<Preset>, list: Array<string>) {
        return items.filter((e) => !list.includes(e._id))
    }
}
