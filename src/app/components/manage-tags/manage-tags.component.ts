import { Component, OnInit } from '@angular/core'
import { ModalController, NavController } from '@ionic/angular'
import { HiddenTagsComponent } from './hidden-tags/hidden-tags.component'
import { forkJoin } from 'rxjs'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'
import { switchMap } from 'rxjs/operators'
import { TagConfig } from '@osmgo/type'
import { ActiveTagsComponent } from './active-tags/active-tags.component'
import { BookmarkedTagsComponent } from './bookmarked-tags/bookmarked-tags.component'
import { MapService } from '@services/map.service'
import { InitService } from '@services/init.service'

@Component({
    selector: 'app-manage-tags',
    templateUrl: './manage-tags.component.html',
    styleUrls: ['./manage-tags.component.scss'],
})
export class ManageTagsComponent implements OnInit {
    tags: TagConfig[]
    refreshFilterMapAfterClose = false

    constructor(
        public modalCtrl: ModalController,
        public initService: InitService,
        public configService: ConfigService,
        public mapService: MapService,
        public tagsService: TagsService,
        public navCtrl: NavController
    ) {}

    ngOnInit() {
        if (!this.initService.isLoaded) {
            this.initService.initLoadData$().subscribe()
        }
    }

    async openHiddenTagsModal() {
        const modal = await this.modalCtrl.create({
            component: HiddenTagsComponent,
        })
        await modal.present()

        modal.onDidDismiss().then((d) => {
            if (d.data === true || d.data === undefined) {
                this.refreshFilterMapAfterClose = true
            }
        })
    }

    async openActiveTagsModal() {
        const modal = await this.modalCtrl.create({
            component: ActiveTagsComponent,
        })
        await modal.present()

        modal.onDidDismiss().then((d) => {
            if (d.data === true || d.data === undefined) {
                this.refreshFilterMapAfterClose = true
            }
        })
    }

    async openBookmarkedTagsModal() {
        const modal = await this.modalCtrl.create({
            component: BookmarkedTagsComponent,
        })
        await modal.present()

        modal.onDidDismiss().then((d) => {})
    }

    back() {
        if (this.mapService.map) {
            //&& this.refreshFilterMapAfterClose === true
            this.mapService.filterMakerByIds(this.tagsService.hiddenTagsIds)
        }

        this.navCtrl.back()
    }
}
