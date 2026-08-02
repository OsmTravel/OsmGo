import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
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
        FormsModule,
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
export class ActiveTagsComponent implements OnInit {
    readonly configService = inject(ConfigService)
    readonly tagsService = inject(TagsService)
    readonly modalCtrl = inject(ModalController)

    searchText = ''
    refreshFilterMapAfterClose = false

    ngOnInit() {}

    removeHiddenTag(tag: TagConfig) {
        this.tagsService.removeHiddenTag(tag)
        this.refreshFilterMapAfterClose = true
    }

    addHiddenTag(tag: TagConfig) {
        this.tagsService.addHiddenTag(tag)
    }
}
