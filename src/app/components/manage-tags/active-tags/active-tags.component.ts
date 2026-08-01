import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'
import { ModalController } from '@ionic/angular'
import { TagConfig } from '@osmgo/type'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'

@Component({
    selector: 'app-active-tags',
    templateUrl: './active-tags.component.html',
    styleUrls: ['./active-tags.component.scss', '../sharedStyle.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class ActiveTagsComponent implements OnInit {
    searchText = ''
    refreshFilterMapAfterClose = false

    constructor(
        public configService: ConfigService,
        public tagsService: TagsService,
        public modalCtrl: ModalController
    ) {}

    ngOnInit() {}

    removeHiddenTag(tag: TagConfig) {
        this.tagsService.removeHiddenTag(tag)
        this.refreshFilterMapAfterClose = true
    }

    addHiddenTag(tag: TagConfig) {
        this.tagsService.addHiddenTag(tag)
    }
}
