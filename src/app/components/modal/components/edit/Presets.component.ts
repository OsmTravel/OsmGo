import { Component, input, output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { TranslateModule } from '@ngx-translate/core'
import type { Preset, Tag } from '@osmgo/type'
import { DisplayPresetLabelPipe } from '@pipes/displayPresetLabel.pipe'
import { OpeningHoursComponent } from '../opening-hours/opening-hours.component'
import type { TagSelectionChange } from '../select/select.component'
import { SelectComponent } from '../select/select.component'

@Component({
    selector: 'edit-presets',
    styleUrls: ['Presets.component.scss'],
    templateUrl: './Presets.component.html',
    imports: [
        DisplayPresetLabelPipe,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
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
    readonly tagChange = output<TagSelectionChange>()

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
