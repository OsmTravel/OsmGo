import { Pipe } from '@angular/core';

@Pipe({
    name: 'displayPresetLabel',
    pure: false
})

export class DisplayPresetLabelPipe  {
    transform(tag, preset) {
        if ( !preset || !preset.options){
            return
        }
        let res = preset.options.find( p => p.v === tag.value) || undefined;
        return res
    }
}