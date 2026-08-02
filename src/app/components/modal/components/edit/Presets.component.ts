import {
    ChangeDetectionStrategy,
    Component,
    Input,
    output,
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
    // TODO: Skipped for migration because:
    //  Class of this input is manually instantiated. This is discouraged and prevents
    //  migration.
    @Input() displayCode
    // TODO: Skipped for migration because:
    //  Your application code writes to the input. This prevents migration.
    @Input() tag
    // TODO: Skipped for migration because:
    //  Class of this input is manually instantiated. This is discouraged and prevents
    //  migration.
    @Input() language
    // TODO: Skipped for migration because:
    //  Your application code writes to the input. This prevents migration.
    @Input() preset

    readonly openPrimaryListModal = output<unknown>()
    readonly addTags = output<Record<string, string>>()

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
