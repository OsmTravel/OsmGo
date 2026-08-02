import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core'
import { IconComponent } from '@components/icon/icon.component'
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone'
import { TagConfig } from '@osmgo/type'
import { DisplayTagsPipe } from '@pipes/display-tags.pipe'

@Component({
    selector: 'primary-key',
    styleUrls: ['PrimaryKey.scss'],
    templateUrl: 'PrimaryKey.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [DisplayTagsPipe, IconComponent, IonCard, IonCardContent, IonIcon],
})
export class PrimaryKey {
    readonly openPrimaryTagModal = output<void>()
    readonly toggleBookmark = output<void>()

    readonly tagConfig = input<TagConfig>()
    readonly language = input(undefined)
    readonly jsonSprites = input(undefined)
    readonly isBookmarked = input(undefined)

    readonly displayCode = input(undefined)
    readonly isEditMode = input(undefined)

    ngOnInit(): void {}
    emitOpenModal() {
        this.openPrimaryTagModal.emit()
    }
    emitToggleBookmark() {
        this.toggleBookmark.emit()
    }
}
