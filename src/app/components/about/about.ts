import { Component } from '@angular/core'

import { Platform, ModalController, NavController } from '@ionic/angular'
import { ToastController } from '@ionic/angular'

import { ConfigService } from '@services/config.service'
@Component({
    selector: 'page-about',
    templateUrl: './about.html',
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

    async tap(e) {
        if (e.tapCount == 5) {
            await this.presentToast()
            this.configService.setIsDevMode(true)
        }
    }

    dismiss(data = null) {
        this.viewCtrl.dismiss(data)
    }
}
