import { Component, input, output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { TranslateModule } from '@ngx-translate/core'
import type { Preset, Tag } from '@osmgo/type'
import { DisplayPresetLabelPipe } from '@pipes/displayPresetLabel.pipe'

@Component({
    selector: 'app-select',
    templateUrl: './select.component.html',
    styleUrls: ['./select.component.scss', '../style.scss'],
    imports: [
        DisplayPresetLabelPipe,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        TranslateModule,
    ],
})
export class SelectComponent {
    readonly displayCode = input(false)
    readonly tag = input.required<Tag>()
    readonly preset = input.required<Preset>()
    readonly language = input('en')

    readonly addTags = output<Record<string, string>>()

    get selectedValue(): string | number {
        return this.isMultiKeyPreset()
            ? this.tag().value === 'yes'
                ? this.tag().key
                : ''
            : this.tag().value
    }

    selectChange(newValue: string): void {
        if (this.isMultiKeyPreset()) {
            const selectedKey = (this.preset().keys ?? []).includes(newValue)
                ? newValue
                : ''
            this.tag().key = selectedKey
            this.tag().value = selectedKey ? 'yes' : ''
        } else {
            this.tag().value = newValue
        }

        const currentPresetOption = this.preset().options?.find(
            (po) => po.v == newValue
        )
        const extraTags = currentPresetOption?.tags
        if (extraTags) {
            this.addTags.emit(extraTags)
        }
    }

    private isMultiKeyPreset(): boolean {
        return !this.preset().key && Array.isArray(this.preset().keys)
    }
}
