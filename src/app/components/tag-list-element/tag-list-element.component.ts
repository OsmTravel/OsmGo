import {
    ChangeDetectionStrategy,
    Component,
    Input,
    input,
    OnInit,
    output,
} from '@angular/core'
import { IconComponent } from '@components/icon/icon.component'
import { IonButton, IonIcon } from '@ionic/angular/standalone'
import { TagConfig } from '@osmgo/type'
import { DisplayTagsPipe } from '@pipes/display-tags.pipe'
import { IsBookmarkedPipe } from '@pipes/is-bookmarked.pipe'

@Component({
    selector: 'app-tag-list-element',
    templateUrl: './tag-list-element.component.html',
    styleUrls: ['./tag-list-element.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        DisplayTagsPipe,
        IconComponent,
        IonButton,
        IonIcon,
        IsBookmarkedPipe,
    ],
})
export class TagListElementComponent implements OnInit {
    // TODO: Skipped for migration because:
    //  Your application code writes to the input. This prevents migration.
    @Input() tag: any
    readonly countryTags = input(undefined)
    readonly languageTags = input(undefined)
    // TODO: Skipped for migration because:
    //  Your application code writes to the input. This prevents migration.
    @Input() jsonSprites
    readonly geometriesFilter = input<string[]>(undefined)
    readonly bookmarksIds = input<string[]>(undefined)
    // TODO: Skipped for migration because:
    //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
    //  and migrating would break narrowing currently.
    @Input() oldTagConfig: TagConfig
    readonly isHiddenTag = input<boolean>(undefined)
    readonly showHideTagButton = input<boolean>(undefined)

    readonly removeBookmark = output<TagConfig>()
    readonly addBookmark = output<TagConfig>()
    readonly removeHiddenTag = output<TagConfig>()
    readonly addHiddenTag = output<TagConfig>()

    constructor() {}

    ngOnInit() {}

    readonly selected = output<TagConfig>()

    isBookMarked(tag) {
        // TODO pipe
        return this.bookmarksIds().includes(tag.id)
    }

    addOrRemoveBookmark(tag) {
        const isBookMarked = this.isBookMarked(tag)
        if (isBookMarked) {
            this.removeBookmark.emit(tag)
        } else {
            this.addBookmark.emit(tag)
        }
    }
}
