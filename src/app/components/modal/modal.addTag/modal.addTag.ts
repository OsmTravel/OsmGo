import { Component } from '@angular/core'
import { ModalController, NavParams } from '@ionic/angular'
import { TagsService } from '@services/tags.service'
import { ConfigService } from '@services/config.service'
import { TranslateService } from '@ngx-translate/core'
import { Preset } from '@osmgo/type'
import { nameToOsmKey } from '@osmgo/utils'

@Component({
    selector: 'modal-add-tag',
    templateUrl: './modal.addTag.html',
    styleUrls: ['./modal.addTag.scss'],
})
export class ModalAddTag {
    moreFields: Array<string>
    usedList: Array<string>

    language: string
    countryCode: string

    presets: Array<Preset>
    searchFilter: string

    constructor(
        public params: NavParams,
        public modalCtrl: ModalController,
        public tagsService: TagsService,
        public configService: ConfigService,
        public translate: TranslateService
    ) {
        this.moreFields = params.data.moreFields
        this.usedList = params.data.usedList

        this.language = this.configService.config.languageTags
        this.countryCode = this.configService.config.countryTags

        this.presets = Object.values(tagsService.presets)
        this.searchFilter = ''
    }

    dismiss(data = null) {
        this.modalCtrl.dismiss(data)
    }

    select(key) {
        this.dismiss(nameToOsmKey(key))
    }

    nameToOsmKey(name) {
        return nameToOsmKey(name)
    }
}
