import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnInit,
    output,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCol,
    IonIcon,
    IonInput,
    IonItem,
    IonSelect,
    IonSelectOption,
} from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import { DisplayPresetLabelPipe } from '@pipes/displayPresetLabel.pipe'

@Component({
    selector: 'app-select',
    templateUrl: './select.component.html',
    styleUrls: ['./select.component.scss', '../style.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        DisplayPresetLabelPipe,
        FormsModule,
        IonCard,
        IonCardContent,
        IonCardHeader,
        IonCol,
        IonIcon,
        IonInput,
        IonItem,
        IonSelect,
        IonSelectOption,
        TranslateModule,
    ],
})
export class SelectComponent implements OnInit {
    // TODO: Skipped for migration because:
    //  Class of this input is manually instantiated. This is discouraged and prevents
    //  migration.
    @Input() displayCode
    // TODO: Skipped for migration because:
    //  Your application code writes to the input. This prevents migration.
    @Input() tag
    // TODO: Skipped for migration because:
    //  Your application code writes to the input. This prevents migration.
    @Input() preset
    // TODO: Skipped for migration because:
    //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
    //  and migrating would break narrowing currently.
    @Input() language

    readonly addTags = output<Record<string, string>>()

    constructor() {}

    ngOnInit() {}

    get selectedValue(): string | number {
        return this.isMultiKeyPreset()
            ? this.tag.value === 'yes'
                ? this.tag.key
                : ''
            : this.tag.value
    }

    selectChange(e) {
        if (!e?.detail) return

        const newValue = e.detail.value
        if (this.isMultiKeyPreset()) {
            const selectedKey = this.preset.keys.includes(newValue)
                ? newValue
                : ''
            this.tag.key = selectedKey
            this.tag.value = selectedKey ? 'yes' : ''
        } else {
            this.tag.value = newValue
        }

        const currentPresetOption = this.preset.options.find(
            (po) => po.v == newValue
        )
        if (currentPresetOption && currentPresetOption.tags) {
            this.addTags.emit(currentPresetOption.tags)
        }
    }

    private isMultiKeyPreset(): boolean {
        return !this.preset.key && Array.isArray(this.preset.keys)
    }
}
