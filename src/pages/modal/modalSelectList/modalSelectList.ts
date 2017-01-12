import { Component } from '@angular/core';
import { ModalController, NavParams, ViewController, Platform } from 'ionic-angular';


@Component({
    templateUrl: 'modalSelectList.html',
     selector: 'modal-select-list',
})
export class ModalSelectList {
    data;
    newTag;
    searchText = '';
    constructor(
        public params: NavParams,
        public viewCtrl: ViewController,
        public modalCtrl: ModalController,
        public platform: Platform


    ) {
        this.data = params.data;
        this.platform.registerBackButtonAction(e => {
            this.dismiss();
        });
    }

    dismiss(data = null) {
        this.viewCtrl.dismiss(data);
    }

    searchTextChange(e) {
        //this.allTags[this.selectedKey].value;

    }

    selected(e) {
        //console.log(e);
        if (e) {
            this.dismiss(e);
        }

    }

}