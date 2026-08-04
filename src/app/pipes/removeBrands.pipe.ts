import { Pipe } from '@angular/core'
import type { Preset } from '@osmgo/type'

@Pipe({
    name: 'removeBrands',
})
export class RemoveBrandsPipe {
    transform(items: Array<Preset>) {
        return items.filter((e) => !e._id.endsWith('#brand'))
    }
}
