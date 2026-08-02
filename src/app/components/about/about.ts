import { ChangeDetectionStrategy, Component } from '@angular/core'
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemGroup,
    IonLabel,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    ModalController,
    NavController,
    Platform,
    ToastController,
} from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'

import { ConfigService } from '@services/config.service'
@Component({
    selector: 'page-about',
    templateUrl: './about.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        IonButton,
        IonButtons,
        IonContent,
        IonHeader,
        IonIcon,
        IonItem,
        IonItemGroup,
        IonLabel,
        IonThumbnail,
        IonTitle,
        IonToolbar,
        TranslateModule,
    ],
})
export class AboutPage {
    constructor(
        public configService: ConfigService,
        public platform: Platform,
        public viewCtrl: ModalController,
        public navCtrl: NavController,
        public toastController: ToastController
    ) {}

    async presentToast() {
        const toast = await this.toastController.create({
            message: 'You have activated the developer mode!',
            duration: 2000,
        })
        toast.present()
    }

    dismiss(data = null) {
        this.viewCtrl.dismiss(data)
    }
}
