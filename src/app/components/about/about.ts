import { Component, inject } from '@angular/core'
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
    readonly configService = inject(ConfigService)
    readonly platform = inject(Platform)
    readonly viewCtrl = inject(ModalController)
    readonly navCtrl = inject(NavController)
    readonly toastController = inject(ToastController)

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
