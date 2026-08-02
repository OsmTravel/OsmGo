import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'
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
import { FilterByTagsContentPipe } from '@pipes/filterByTagsContent.pipe'
import { FiltersTagsByIdsPipe } from '@pipes/filters-tags-by-ids.pipe'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'

@Component({
    selector: 'app-bookmarked-tags',
    templateUrl: './bookmarked-tags.component.html',
    styleUrls: ['./bookmarked-tags.component.scss', '../sharedStyle.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        FilterByTagsContentPipe,
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
export class BookmarkedTagsComponent implements OnInit {
    searchText = ''

    constructor(
        public configService: ConfigService,
        public tagsService: TagsService,
        public modalCtrl: ModalController
    ) {}

    ngOnInit() {}
}
