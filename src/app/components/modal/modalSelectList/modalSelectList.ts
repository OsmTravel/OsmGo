
import { Component } from '@angular/core';
import { ModalController, Platform, NavParams } from '@ionic/angular';

@Component({
    templateUrl: './modalSelectList.html',
    styleUrls: ['./modalSelectList.scss'],
    selector: 'modal-select-list',
})
export class ModalSelectList {
    data;
    searchText = '';
    initvalue: string;
    constructor(
        public params: NavParams,
        public modalCtrl: ModalController,
        public platform: Platform

    ) {
        this.initvalue = params.data.value;
        this.data = params.data;

        // this.platform.registerBackButtonAction(e => {
        //     this.dismiss();
        // });
    }

    dismiss(data = null) {
        this.modalCtrl.dismiss(data);
    }

    selected(e) {
        console.log(e.detail.value);
        if (e && e.detail && this.initvalue !== e.detail) {
            this.dismiss({ 'key': this.data.key, 'value': e.detail.value });
        }
    }

}
