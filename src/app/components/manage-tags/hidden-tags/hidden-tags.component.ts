import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'
import { ModalController } from '@ionic/angular'
import { TagConfig } from '@osmgo/type'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'

@Component({
    selector: 'app-hidden-tags',
    templateUrl: './hidden-tags.component.html',
    styleUrls: ['./hidden-tags.component.scss', '../sharedStyle.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
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
