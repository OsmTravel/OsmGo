import { Component } from '@angular/core';

import { Platform, ModalController, NavController } from '@ionic/angular';


import { ConfigService } from '../../services/config.service';
@Component({
  selector: 'page-about',
  templateUrl: './about.html'
})
export class AboutPage {



  constructor(public configService: ConfigService, public platform: Platform,
    public viewCtrl: ModalController,
    public navCtrl: NavController) {

    // this.platform.registerBackButtonAction(e => {
    //   this.dismiss();
    // });

  }

  dismiss(data = null) {
    this.viewCtrl.dismiss(data);
  }

}
