import { ChangeDetectionStrategy, Component, Input, input } from '@angular/core'
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
    // TODO: Skipped for migration because:
    //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
    //  and migrating would break narrowing currently.
    @Input() displayCode
    // TODO: Skipped for migration because:
    //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
    //  and migrating would break narrowing currently.
    @Input() tag
    // TODO: Skipped for migration because:
    //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
    //  and migrating would break narrowing currently.
    @Input() preset
    readonly language = input(undefined)
    readonly countryCode = input(undefined)

    ngOnInit(): void {}
}
