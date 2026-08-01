import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'
import { ModalController } from '@ionic/angular'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'

@Component({
    selector: 'app-bookmarked-tags',
    templateUrl: './bookmarked-tags.component.html',
    styleUrls: ['./bookmarked-tags.component.scss', '../sharedStyle.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
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
