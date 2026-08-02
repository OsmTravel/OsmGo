import { Component, input, output } from '@angular/core'
import { IconComponent } from '@components/icon/icon.component'
import { IonButton, IonIcon } from '@ionic/angular/standalone'
import type { TagConfig } from '@osmgo/type'
import { DisplayTagsPipe } from '@pipes/display-tags.pipe'
import { IsBookmarkedPipe } from '@pipes/is-bookmarked.pipe'

interface SpritePosition {
    height: number
    width: number
    x: number
    y: number
}

@Component({
    selector: 'app-tag-list-element',
    templateUrl: './tag-list-element.component.html',
    styleUrls: ['./tag-list-element.component.scss'],
    imports: [
        DisplayTagsPipe,
        IconComponent,
        IonButton,
        IonIcon,
        IsBookmarkedPipe,
    ],
})
export class TagListElementComponent {
    readonly tag = input.required<TagConfig>()
    readonly countryTags = input('')
    readonly languageTags = input('en')
    readonly jsonSprites = input.required<Record<string, SpritePosition>>()
    readonly geometriesFilter = input<string[]>([])
    readonly bookmarksIds = input<string[]>([])
    readonly oldTagConfig = input<TagConfig>()
    readonly isHiddenTag = input(false)
    readonly showHideTagButton = input(false)

    readonly removeBookmark = output<TagConfig>()
    readonly addBookmark = output<TagConfig>()
    readonly removeHiddenTag = output<TagConfig>()
    readonly addHiddenTag = output<TagConfig>()

    readonly selected = output<TagConfig>()

    isBookMarked(tag: TagConfig): boolean {
        // TODO pipe
        return this.bookmarksIds().includes(tag.id)
    }

    addOrRemoveBookmark(tag: TagConfig): void {
        const isBookMarked = this.isBookMarked(tag)
        if (isBookMarked) {
            this.removeBookmark.emit(tag)
        } else {
            this.addBookmark.emit(tag)
        }
    }
}
