
import { Component } from '@angular/core';
import { ModalController, Platform, NavParams } from '@ionic/angular';
import { ConfigService } from 'src/app/services/config.service';

@Component({
    templateUrl: './modalSelectList.html',
    styleUrls: ['./modalSelectList.scss'],
    selector: 'modal-select-list',
})
export class ModalSelectList {
    data;
    searchText = '';
    initvalue: string;
    language: string;
    countryCode: string;
    constructor(
        public params: NavParams,
        public modalCtrl: ModalController,
        public platform: Platform,
        public configService: ConfigService

    ) {
        this.initvalue = params.data.value;
        this.data = params.data;
        this.language = this.configService.config.languageTags;
        this.countryCode = this.configService.config.countryTags;

        // this.platform.registerBackButtonAction(e => {
        //     this.dismiss();
        // });
    }

    dismiss(data = null) {
        this.modalCtrl.dismiss(data);
    }

    selected(e) {
        if (e && e.detail && this.initvalue !== e.detail) {
            this.dismiss({ 'key': this.data.key, 'value': e.detail.value.v, 'tags': e.detail.value.tags });
        }
    }

}
