import {
    ChangeDetectionStrategy,
    Component,
    input,
    OnInit,
} from '@angular/core'
import { IconComponent } from '@components/icon/icon.component'
import {
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    ModalController,
} from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import { OsmGoFeature } from '@osmgo/type'

interface SpritePosition {
    height: number
    width: number
    x: number
    y: number
}

type DialogFeature = OsmGoFeature & {
    properties: OsmGoFeature['properties'] & { _name?: string }
}

@Component({
    selector: 'app-dialog-multi-features',
    templateUrl: './dialog-multi-features.component.html',
    styleUrls: ['./dialog-multi-features.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        IconComponent,
        IonHeader,
        IonIcon,
        IonTitle,
        IonToolbar,
        TranslateModule,
    ],
})
export class DialogMultiFeaturesComponent implements OnInit {
    readonly features = input.required<DialogFeature[]>()
    readonly jsonSprites = input.required<Record<string, SpritePosition>>()

    constructor(public modalCtrl: ModalController) {}

    ngOnInit() {}

    selectFeature(feature) {
        this.modalCtrl.dismiss(feature)
    }
}
