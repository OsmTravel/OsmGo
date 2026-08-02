import { Component, inject, input, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import type { Preset } from '@osmgo/type'
import { nameToOsmKey } from '@osmgo/utils'
import { FilterByListPipe } from '@pipes/filterByList.pipe'
import { FilterPresetsByListPipe } from '@pipes/filterPresetsByList.pipe'
import { RemoveBrandsPipe } from '@pipes/removeBrands.pipe'
import { SearchForPipe } from '@pipes/searchFor.pipe'
import { ToOsmTagPipe } from '@pipes/toOsmTag.pipe'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'

@Component({
    selector: 'modal-add-tag',
    templateUrl: './modal.addTag.html',
    styleUrls: ['./modal.addTag.scss'],
    imports: [
        FilterByListPipe,
        FilterPresetsByListPipe,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        RemoveBrandsPipe,
        SearchForPipe,
        ToOsmTagPipe,
        TranslateModule,
    ],
})
export class ModalAddTag {
    private readonly dialogRef = inject(MatDialogRef<ModalAddTag>)
    readonly tagsService = inject(TagsService)
    readonly configService = inject(ConfigService)
    readonly translate = inject(TranslateService)

    readonly moreFields = input<string[]>([])
    readonly usedList = input<string[]>([])

    readonly language = this.configService.config().languageTags
    readonly countryCode = this.configService.config().countryTags

    readonly presets: Array<Preset> = Object.values(this.tagsService.presets())
    readonly searchFilter = signal('')

    onSearchInput(value: string): void {
        this.searchFilter.set(value)
    }

    dismiss(data: string | null = null): void {
        this.dialogRef.close(data)
    }

    select(key: string): void {
        this.dismiss(nameToOsmKey(key))
    }

    nameToOsmKey(name: string): string {
        return nameToOsmKey(name)
    }
}
