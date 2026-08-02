import { Pipe } from '@angular/core'
import type { Preset, PresetOption, Tag } from '@osmgo/type'

@Pipe({
    name: 'displayPresetLabel',
    pure: false,
})
export class DisplayPresetLabelPipe {
    transform(tag: Tag, preset: Preset | undefined): PresetOption | undefined {
        if (!preset || !preset.options) {
            return
        }
        return preset.options.find((option) => option.v === tag.value)
    }
}
