import { Component } from '@angular/core';
import { ModalController, NavParams, ViewController, Platform } from 'ionic-angular';


@Component({
    templateUrl: 'modalSelectList.html',
     selector: 'modal-select-list',
})
export class ModalSelectList {
    data;
    searchText = '';
    initvalue: string;
    constructor(
        public params: NavParams,
        public viewCtrl: ViewController,
        public modalCtrl: ModalController,
        public platform: Platform

    ) {
        this.initvalue = params.data.value;
        this.data = params.data;
        
        this.platform.registerBackButtonAction(e => {
            this.dismiss();
        });
    }

    dismiss(data = null) {
        this.viewCtrl.dismiss(data);
    }

    selected(e) {
        if (e && this.initvalue !== e) {
            this.dismiss({'key': this.data.key, value: e });
        }
    }

}