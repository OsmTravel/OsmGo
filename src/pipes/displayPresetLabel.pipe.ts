import { Pipe } from '@angular/core';

@Pipe({
    name: 'displayPresetLabel',
    pure: false
})

export class DisplayPresetLabelPipe  {
    transform(tag) {
       return tag.preset.tags.filter( p => p.v === tag.value)[0] || undefined;
    }
}