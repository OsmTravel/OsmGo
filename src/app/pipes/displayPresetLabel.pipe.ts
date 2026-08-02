import { Pipe } from '@angular/core'
import { normalizeOsmTagValue } from '@app/utils/osm-tags'
import type { Preset, PresetOption, Tag } from '@osmgo/type'

@Pipe({
    name: 'displayPresetLabel',
})
export class DisplayPresetLabelPipe {
    transform(tag: Tag, preset: Preset | undefined): PresetOption | undefined {
        if (!preset || !preset.options) {
            return
        }
        const value = normalizeOsmTagValue(tag.value)
        return preset.options.find(
            (option) => normalizeOsmTagValue(option.v) === value
        )
    }
}
