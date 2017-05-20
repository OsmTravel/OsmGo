import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { Insomnia } from '@ionic-native/insomnia';
import { Device } from '@ionic-native/device';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { LocationService } from '../services/location.service'
import { ConfigService } from '../services/config.service'

import { MainPage } from '../pages/main/main';


@Component({
  template: `
  <ion-nav [root]="rootPage"></ion-nav>`
})
export class MyApp {
  rootPage = MainPage;




  constructor(platform: Platform, private splashScreen: SplashScreen,
    private statusBar: StatusBar, private locationService: LocationService, private device: Device,  private insomnia: Insomnia,
    public configService: ConfigService) {
    this.splashScreen.show();

    platform.ready().then(() => {
      this.splashScreen.hide();
      this.statusBar.styleDefault();


      if (typeof this.device.platform == 'string') {
        this.configService.loadAppVersion();
      }

      this.locationService.eventPlatformReady.emit((typeof this.device.platform == 'string') ? false : true); // object => ionic serve

      if (this.device.platform == 'Android') {
        this.insomnia.keepAwake();
      }




    });

  }
  ngAfterViewInit() {

  }

}
