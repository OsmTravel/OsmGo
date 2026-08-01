import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
} from '@angular/core'
import { IconComponent } from '@components/icon/icon.component'
import { IonicModule } from '@ionic/angular'
import { TagConfig } from '@osmgo/type'
import { DisplayTagsPipe } from '@pipes/display-tags.pipe'
import { IsBookmarkedPipe } from '@pipes/is-bookmarked.pipe'

@Component({
    selector: 'app-tag-list-element',
    templateUrl: './tag-list-element.component.html',
    styleUrls: ['./tag-list-element.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [DisplayTagsPipe, IconComponent, IonicModule, IsBookmarkedPipe],
})
export class TagListElementComponent implements OnInit {
    @Input() tag: any
    @Input() countryTags
    @Input() languageTags
    @Input() jsonSprites
    @Input() geometriesFilter: string[]
    @Input() bookmarksIds: string[]
    @Input() oldTagConfig: TagConfig
    @Input() isHiddenTag: boolean
    @Input() showHideTagButton: boolean

    @Output() removeBookmark = new EventEmitter()
    @Output() addBookmark = new EventEmitter()
    @Output() removeHiddenTag = new EventEmitter()
    @Output() addHiddenTag = new EventEmitter()

    constructor() {}

    ngOnInit() {}

    @Output() selected = new EventEmitter()

    isBookMarked(tag) {
        // TODO pipe
        return this.bookmarksIds.includes(tag.id)
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
