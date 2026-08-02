import { Component, inject, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { ScreenHeaderComponent } from '@components/shared/screen-header/screen-header'
import { TagListElementComponent } from '@components/tag-list-element/tag-list-element.component'
import { TranslateModule } from '@ngx-translate/core'
import { TagConfig } from '@osmgo/type'
import { FilterByTagsContentPipe } from '@pipes/filterByTagsContent.pipe'
import { FiltersTagsByIdsPipe } from '@pipes/filters-tags-by-ids.pipe'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'

@Component({
    selector: 'app-hidden-tags',
    templateUrl: './hidden-tags.component.html',
    styleUrls: ['./hidden-tags.component.scss', '../sharedStyle.scss'],
    imports: [
        FilterByTagsContentPipe,
        FiltersTagsByIdsPipe,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        ScreenHeaderComponent,
        TagListElementComponent,
        TranslateModule,
    ],
})
export class HiddenTagsComponent {
    readonly configService = inject(ConfigService)
    readonly tagsService = inject(TagsService)
    private readonly dialogRef = inject(MatDialogRef<HiddenTagsComponent>)

    readonly searchText = signal('')
    refreshFilterMapAfterClose = false

    onSearchInput(value: string): void {
        this.searchText.set(value)
    }

    close(): void {
        this.dialogRef.close(this.refreshFilterMapAfterClose)
    }

    removeHiddenTag(tag: TagConfig) {
        this.tagsService.removeHiddenTag(tag)
        this.refreshFilterMapAfterClose = true
    }

    addHiddenTag(tag: TagConfig) {
        this.tagsService.addHiddenTag(tag)
    }
}
