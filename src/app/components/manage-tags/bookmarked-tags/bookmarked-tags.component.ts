import { Component, OnInit } from '@angular/core'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'
import { ModalController } from '@ionic/angular'

@Component({
    selector: 'app-bookmarked-tags',
    templateUrl: './bookmarked-tags.component.html',
    styleUrls: ['./bookmarked-tags.component.scss', '../sharedStyle.scss'],
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
