import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import {
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonIcon,
} from '@ionic/angular/standalone'
import { DisplayPresetLabelPipe } from '@pipes/displayPresetLabel.pipe'
import { OpeningHoursComponent } from '../opening-hours/opening-hours.component'

@Component({
    selector: 'read-presets',
    templateUrl: 'Presets.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
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
    @Input() displayCode
    @Input() tag
    @Input() preset
    @Input() language
    @Input() countryCode

    ngOnInit(): void {}
}
