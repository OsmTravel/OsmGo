import { Component, OnInit } from '@angular/core'
import { ModalController, Platform, NavParams } from '@ionic/angular'
import { TagsService } from '../../../services/tags.service'
import { ConfigService } from '../../../services/config.service'
import { TagConfig } from '../../../../type'

@Component({
    selector: 'modal-primary-tag',
    templateUrl: './modal.primaryTag.html',
    styleUrls: ['./modal.primaryTag.scss'],
})
export class ModalPrimaryTag implements OnInit {
    selectedKey: string
    tagsOfselectedKey
    loading = true
    allTags: TagConfig[]
    searchText = ''
    currentListOfTags: TagConfig[] = []
    typeFiche = 'list'
    customValue = ''
    oldTagConfig: TagConfig
    geometriesPossible: string[] = []
    geometryType: 'point' | 'vertex' | 'line' | 'area'
    displayType = 'lastTags'
    countryTags

    constructor(
        public params: NavParams,
        public modalCtrl: ModalController,
        public tagsService: TagsService,
        public configService: ConfigService
    ) {
        this.oldTagConfig = this.params.data.tagConfig
    }

    ngOnInit() {
        this.displayType =
            this.configService.config.defaultPrimarykeyWindows == 'bookmarks'
                ? 'bookmarks'
                : 'lastTags'
        this.geometryType = this.params.data.geometryType
        this.currentListOfTags = this.tagsService.tags
        this.loading = false
    }

    dismiss(data = null) {
        this.modalCtrl.dismiss(data)
    }

    summit(data) {
        this.dismiss(data)
    }
    cancel() {
        this.dismiss()
    }

    selected(config) {
        this.summit(config)
    }

    addBookmark(tag: TagConfig) {
        this.tagsService.addBookMark(tag)
    }
    removeBookmark(tag: TagConfig) {
        this.tagsService.removeBookMark(tag)
    }

    addCustomValue(key, value) {
        // TODO: ckeck if aleardy exist
        const newConfig: TagConfig = {
            icon: 'maki-circle-custom',
            markerColor: '#000000',
            geometry: ['point', 'vertex', 'line', 'area'],
            lbl: { en: `${key} = ${value}` },
            presets: [],
            id: `${key}/${value}`,
            key: value,
            tags: {},
            isUserTag: true,
        }
        newConfig.tags[key] = value

        this.tagsService.addUserTags(newConfig)

        this.summit(newConfig)
    }

    swipeLeft() {
        console.log('this.swipeLeft')
        this.displayType = 'bookmarks'
    }
    swipeRight() {
        console.log('swipeRight')
        this.displayType = 'lastTags'
    }

    changePageLastTagsBookmarks(value) {
        this.displayType = value
        this.configService.setDefaultPrimarykeyWindows(value)
    }
}
