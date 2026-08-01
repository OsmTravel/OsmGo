import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TagListElementComponent } from '@components/tag-list-element/tag-list-element.component'
import { IonicModule, ModalController } from '@ionic/angular'
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
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        FilterByTagsContentPipe,
        FiltersTagsByIdsPipe,
        FormsModule,
        IonicModule,
        TagListElementComponent,
        TranslateModule,
    ],
})
export class HiddenTagsComponent implements OnInit {
    constructor(
        public configService: ConfigService,
        public tagsService: TagsService,
        public modalCtrl: ModalController
    ) {}

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
