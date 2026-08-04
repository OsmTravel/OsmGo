import { Component, inject, input, type OnInit, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatRadioModule } from '@angular/material/radio'
import { TranslateModule } from '@ngx-translate/core'
import type { Preset, PresetOption } from '@osmgo/type'
import { FilterByCountryCode } from '@pipes/filterByCountryCode.pipe'
import { FilterByPresetsContentPipe } from '@pipes/filterByPresetsContent.pipe'
import { ConfigService } from '@services/config.service'

interface ModalSelectListData {
    key: string
    preset: Preset
    value: string
}

interface SelectablePresetOption extends PresetOption {
    tags?: Record<string, string>
}

interface ModalSelectListResult {
    key: string
    value: string
    tags?: Record<string, string>
}

@Component({
    templateUrl: './modalSelectList.html',
    styleUrls: ['./modalSelectList.scss'],
    selector: 'modal-select-list',
    imports: [
        FilterByCountryCode,
        FilterByPresetsContentPipe,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatRadioModule,
        TranslateModule,
    ],
})
export class ModalSelectList implements OnInit {
    private readonly dialogRef = inject(MatDialogRef<ModalSelectList>)
    readonly configService = inject(ConfigService)

    readonly data = input.required<ModalSelectListData>()
    readonly searchText = signal('')
    initialValue = ''
    readonly language = this.configService.config().languageTags
    readonly countryCode = this.configService.config().countryTags

    ngOnInit(): void {
        this.initialValue = this.data().value
    }

    onSearchInput(value: string): void {
        this.searchText.set(value)
    }

    dismiss(data: ModalSelectListResult | null = null): void {
        this.dialogRef.close(data)
    }

    selected(option: SelectablePresetOption): void {
        if (option && this.initialValue !== option.v) {
            this.dismiss({
                key: this.data().key,
                value: option.v,
                tags: option.tags,
            })
        }
    }
}
