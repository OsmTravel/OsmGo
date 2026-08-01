import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { IonicModule } from '@ionic/angular'
import { DisplayPresetLabelPipe } from '@pipes/displayPresetLabel.pipe'
import { OpeningHoursComponent } from '../opening-hours/opening-hours.component'

@Component({
    selector: 'read-presets',
    templateUrl: 'Presets.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [DisplayPresetLabelPipe, IonicModule, OpeningHoursComponent],
})
export class ReadPresets {
    @Input() displayCode
    @Input() tag
    @Input() preset
    @Input() language
    @Input() countryCode

    ngOnInit(): void {}
}
