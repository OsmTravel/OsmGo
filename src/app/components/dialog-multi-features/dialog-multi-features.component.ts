import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnInit,
} from '@angular/core'
import { IconComponent } from '@components/icon/icon.component'
import { IonicModule, ModalController, NavParams } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'

@Component({
    selector: 'app-dialog-multi-features',
    templateUrl: './dialog-multi-features.component.html',
    styleUrls: ['./dialog-multi-features.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [IconComponent, IonicModule, TranslateModule],
})
export class DialogMultiFeaturesComponent implements OnInit {
    // @Input() features: string;
    features: any
    jsonSprites: any
    constructor(
        navParams: NavParams,
        public modalCtrl: ModalController
    ) {
        // console.log(this.features)
        this.features = navParams.get('features')
        this.jsonSprites = navParams.get('jsonSprites')
    }

    ngOnInit() {}

    selectFeature(feature) {
        this.modalCtrl.dismiss(feature)
    }
}
