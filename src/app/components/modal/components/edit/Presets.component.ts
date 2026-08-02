import { Component, input, output } from '@angular/core'
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
import type { Preset, Tag } from '@osmgo/type'
import { DisplayPresetLabelPipe } from '@pipes/displayPresetLabel.pipe'
import { OpeningHoursComponent } from '../opening-hours/opening-hours.component'
import { SelectComponent } from '../select/select.component'

@Component({
    selector: 'edit-presets',
    styleUrls: ['../style.scss'],
    templateUrl: './Presets.component.html',
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
    readonly displayCode = input(false)
    readonly tag = input.required<Tag>()
    readonly language = input('en')
    readonly preset = input.required<Preset>()

    readonly openPrimaryListModal = output<unknown>()
    readonly addTags = output<Record<string, string>>()

    get isMultiKeyPreset(): boolean {
        return (
            !this.preset()?.key &&
            (this.preset().keys?.length ?? 0) > 0 &&
            (this.preset().options?.length ?? 0) > 0
        )
    }

    get openingHoursValue(): string {
        return String(this.tag().value ?? '')
    }

    emitOpenModal(tag: Tag): void {
        if (!this.displayCode() && this.preset().type === 'list') {
            this.openPrimaryListModal.emit(tag)
        }
    }
}
