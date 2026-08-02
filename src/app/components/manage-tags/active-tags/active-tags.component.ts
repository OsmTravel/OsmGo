import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
} from '@angular/core'
import { TagListElementComponent } from '@components/tag-list-element/tag-list-element.component'
import {
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonItem,
    IonList,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    ModalController,
} from '@ionic/angular/standalone'
import type { SearchbarInputEventDetail } from '@ionic/core'
import { TranslateModule } from '@ngx-translate/core'
import { TagConfig } from '@osmgo/type'
import { FilterByTagsContentPipe } from '@pipes/filterByTagsContent.pipe'
import { FilterDeprecatedTagPipe } from '@pipes/filterDeprecatedTag.pipe'
import { FiltersTagsByIdsPipe } from '@pipes/filters-tags-by-ids.pipe'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'

@Component({
    selector: 'app-active-tags',
    templateUrl: './active-tags.component.html',
    styleUrls: ['./active-tags.component.scss', '../sharedStyle.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        FilterByTagsContentPipe,
        FilterDeprecatedTagPipe,
        FiltersTagsByIdsPipe,
        IonButton,
        IonButtons,
        IonContent,
        IonFooter,
        IonHeader,
        IonIcon,
        IonItem,
        IonList,
        IonSearchbar,
        IonTitle,
        IonToolbar,
        TagListElementComponent,
        TranslateModule,
    ],
})
export class ActiveTagsComponent {
    readonly configService = inject(ConfigService)
    readonly tagsService = inject(TagsService)
    readonly modalCtrl = inject(ModalController)

    readonly searchText = signal('')
    refreshFilterMapAfterClose = false

    onSearchInput(event: CustomEvent<SearchbarInputEventDetail>): void {
        this.searchText.set(event.detail.value ?? '')
    }

    removeHiddenTag(tag: TagConfig) {
        this.tagsService.removeHiddenTag(tag)
        this.refreshFilterMapAfterClose = true
    }

    addHiddenTag(tag: TagConfig) {
        this.tagsService.addHiddenTag(tag)
    }
}
