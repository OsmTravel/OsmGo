import { Component, input } from '@angular/core'
import {
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonIcon,
} from '@ionic/angular/standalone'
import { Preset, Tag } from '@osmgo/type'
import { DisplayPresetLabelPipe } from '@pipes/displayPresetLabel.pipe'
import { OpeningHoursComponent } from '../opening-hours/opening-hours.component'

@Component({
    selector: 'read-presets',
    templateUrl: 'Presets.component.html',
    imports: [
        DisplayPresetLabelPipe,
        IonCard,
        IonCardContent,
        IonCardHeader,
        IonIcon,
        OpeningHoursComponent,
    ],
})
export class ReadPresets {
    readonly displayCode = input(false)
    readonly tag = input.required<Tag>()
    readonly preset = input.required<Preset>()
    readonly language = input('en')
    readonly countryCode = input('')

    get openingHoursValue(): string {
        return String(this.tag().value ?? '')
    }
}
