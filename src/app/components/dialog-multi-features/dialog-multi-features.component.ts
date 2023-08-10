import { Component, OnInit, Input } from '@angular/core'
import { NavParams, ModalController } from '@ionic/angular'

@Component({
    selector: 'app-dialog-multi-features',
    templateUrl: './dialog-multi-features.component.html',
    styleUrls: ['./dialog-multi-features.component.scss'],
})
export class DialogMultiFeaturesComponent implements OnInit {
    // @Input() features: string;
    features: any
    jsonSprites: any
    constructor(navParams: NavParams, public modalCtrl: ModalController) {
        // console.log(this.features)
        this.features = navParams.get('features')
        this.jsonSprites = navParams.get('jsonSprites')
    }

    ngOnInit() {}

    selectFeature(feature) {
        this.modalCtrl.dismiss(feature)
    }
}
