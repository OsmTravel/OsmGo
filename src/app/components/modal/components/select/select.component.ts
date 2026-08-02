import {
    ChangeDetectionStrategy,
    Component,
    input,
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
import { Preset, Tag } from '@osmgo/type'
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
    readonly displayCode = input(false)
    readonly tag = input.required<Tag>()
    readonly preset = input.required<Preset>()
    readonly language = input('en')

    readonly addTags = output<Record<string, string>>()

    constructor() {}

    ngOnInit() {}

    get selectedValue(): string | number {
        return this.isMultiKeyPreset()
            ? this.tag().value === 'yes'
                ? this.tag().key
                : ''
            : this.tag().value
    }

    selectChange(e) {
        if (!e?.detail) return

        const newValue = e.detail.value
        if (this.isMultiKeyPreset()) {
            const selectedKey = this.preset().keys.includes(newValue)
                ? newValue
                : ''
            this.tag().key = selectedKey
            this.tag().value = selectedKey ? 'yes' : ''
        } else {
            this.tag().value = newValue
        }

        const currentPresetOption = this.preset().options.find(
            (po) => po.v == newValue
        )
        const extraTags = (
            currentPresetOption as unknown as {
                tags?: Record<string, string>
            }
        )?.tags
        if (extraTags) {
            this.addTags.emit(extraTags)
        }
    }

    private isMultiKeyPreset(): boolean {
        return !this.preset().key && Array.isArray(this.preset().keys)
    }
}
