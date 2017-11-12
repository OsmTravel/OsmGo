import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
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

  
  
  // let status bar overlay webview


  constructor(platform: Platform, private splashScreen: SplashScreen,
    private statusBar: StatusBar, private locationService: LocationService, private device: Device,
    public configService: ConfigService) {
    this.splashScreen.show();

    platform.ready().then(() => {
      this.splashScreen.hide();
      this.statusBar.overlaysWebView(true);
      // set status bar to white
      this.statusBar.backgroundColorByHexString('#3F51B5');


      if (typeof this.device.platform == 'string') {
        this.configService.loadAppVersion();
      }

      this.locationService.eventPlatformReady.emit((typeof this.device.platform == 'string') ? false : true); // object => ionic serve

    });

  }
  ngAfterViewInit() {

  }

}
