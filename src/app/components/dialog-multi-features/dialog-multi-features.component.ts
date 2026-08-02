import { Component, inject, input } from '@angular/core'
import { IconComponent } from '@components/icon/icon.component'
import {
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    ModalController,
} from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import type { JsonSprites, OsmGoFeature } from '@osmgo/type'

type DialogFeature = OsmGoFeature & {
    properties: OsmGoFeature['properties'] & { _name?: string }
}

@Component({
    selector: 'app-dialog-multi-features',
    templateUrl: './dialog-multi-features.component.html',
    styleUrls: ['./dialog-multi-features.component.scss'],
    imports: [
        IconComponent,
        IonHeader,
        IonIcon,
        IonTitle,
        IonToolbar,
        TranslateModule,
    ],
})
export class DialogMultiFeaturesComponent {
    readonly modalCtrl = inject(ModalController)

    readonly features = input.required<DialogFeature[]>()
    readonly jsonSprites = input.required<JsonSprites>()

    selectFeature(feature: DialogFeature) {
        this.modalCtrl.dismiss(feature)
    }
}
