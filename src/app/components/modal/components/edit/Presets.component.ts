import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
} from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import { DisplayPresetLabelPipe } from '@pipes/displayPresetLabel.pipe'
import { OpeningHoursComponent } from '../opening-hours/opening-hours.component'
import { SelectComponent } from '../select/select.component'

@Component({
    selector: 'edit-presets',
    styleUrls: ['../style.scss'],
    templateUrl: './Presets.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        DisplayPresetLabelPipe,
        FormsModule,
        IonCard,
        IonCardContent,
        IonCardHeader,
        IonIcon,
        IonInput,
        IonItem,
        IonLabel,
        OpeningHoursComponent,
        SelectComponent,
        TranslateModule,
    ],
})
export class EditPresets {
    @Input() displayCode
    @Input() tag
    @Input() language
    @Input() preset

    @Output() openPrimaryListModal = new EventEmitter()
    @Output() addTags = new EventEmitter()

    get isMultiKeyPreset(): boolean {
        return (
            !this.preset?.key &&
            this.preset?.keys?.length > 0 &&
            this.preset?.options?.length > 0
        )
    }

    emitOpenModal(tag) {
        if (!this.displayCode && this.preset.type === 'list') {
            this.openPrimaryListModal.emit(tag)
        }
    }
}
