import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
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
    private statusBar: StatusBar, private locationService: LocationService,
    public configService: ConfigService) {
    this.splashScreen.show();

    this.configService.platforms = platform.platforms()

    platform.ready().then(() => {
      this.splashScreen.hide();
      // this.statusBar.overlaysWebView(true);
      // this.statusBar.styleBlackTranslucent()
      this.statusBar.show();
      
      if (platform.platforms().indexOf('core') === -1){
        this.configService.loadAppVersion();
      }

      this.locationService.eventPlatformReady.emit((platform.platforms().indexOf('core') === -1) ? false : true); // object => == 1 => ionic serve ( ['core'])

    });

  }
  ngAfterViewInit() {
    this.statusBar.hide()
  }

}
