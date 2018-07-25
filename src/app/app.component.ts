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
      console.log(platform.platforms())
    platform.ready().then(() => {
      this.splashScreen.hide();
      // this.statusBar.overlaysWebView(true);
      // this.statusBar.styleBlackTranslucent()
      this.statusBar.show();

      if (platform.platforms().length > 1){
        this.configService.loadAppVersion();
      }

      this.locationService.eventPlatformReady.emit((platform.platforms().length > 1) ? false : true); // object => == 1 => ionic serve ( ['core'])

    });

  }
  ngAfterViewInit() {
    this.statusBar.hide()
  }

}
