import { Component, OnInit } from '@angular/core'
import { ConfigService } from 'src/app/services/config.service'
import { TagsService } from 'src/app/services/tags.service'
import { TagConfig } from 'src/type'
import { ModalController } from '@ionic/angular'

@Component({
    selector: 'app-hidden-tags',
    templateUrl: './hidden-tags.component.html',
    styleUrls: ['./hidden-tags.component.scss', '../sharedStyle.scss'],
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
