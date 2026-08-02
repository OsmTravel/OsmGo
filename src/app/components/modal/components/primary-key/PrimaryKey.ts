import { Component, input, output } from '@angular/core'
import { IconComponent } from '@components/icon/icon.component'
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import type { JsonSprites, TagConfig } from '@osmgo/type'
import { DisplayTagsPipe } from '@pipes/display-tags.pipe'

@Component({
    selector: 'primary-key',
    styleUrls: ['PrimaryKey.scss'],
    templateUrl: 'PrimaryKey.html',
    imports: [
        DisplayTagsPipe,
        IconComponent,
        IonCard,
        IonCardContent,
        IonIcon,
        TranslateModule,
    ],
})
export class PrimaryKey {
    readonly openPrimaryTagModal = output<void>()
    readonly toggleBookmark = output<void>()

    readonly tagConfig = input.required<TagConfig>()
    readonly language = input('en')
    readonly jsonSprites = input.required<JsonSprites>()
    readonly isBookmarked = input(false)

    readonly displayCode = input(false)
    readonly isEditMode = input(false)
    emitOpenModal(): void {
        this.openPrimaryTagModal.emit()
    }
    emitToggleBookmark(): void {
        this.toggleBookmark.emit()
    }
}
