import { Pipe } from '@angular/core'
import { Preset } from '@osmgo/type'
import { nameToOsmKey } from '@osmgo/utils'

@Pipe({
    name: 'toOsmTag',
    pure: false,
})
export class ToOsmTagPipe {
    transform(name: string) {
        return nameToOsmKey(name)
    }
}
