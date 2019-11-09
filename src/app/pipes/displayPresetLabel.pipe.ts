import { Pipe } from '@angular/core';

@Pipe({
    name: 'displayPresetLabel',
    pure: false
})

export class DisplayPresetLabelPipe  {
    transform(tag) {
        if ( !tag.preset || !tag.preset.options){
            return
        }
        let res = tag.preset.options.find( p => p.v === tag.value) || undefined;
        return res
    }
}