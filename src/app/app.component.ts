import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar, Device, Insomnia } from 'ionic-native';
import { Splashscreen } from 'ionic-native';
import { LocationService } from '../services/location.service'
import { ConfigService } from '../services/config.service'

import { MainPage } from '../pages/main/main';


@Component({
  template: `
  <ion-nav [root]="rootPage"></ion-nav>`
})
export class MyApp {
  rootPage = MainPage;
   



  constructor(platform: Platform, private locationService: LocationService, public configService: ConfigService) {
     Splashscreen.show();

    platform.ready().then(() => {
       Splashscreen.hide();
      StatusBar.styleDefault();       


      if (typeof Device.platform == 'string'){
        this.configService.loadAppVersion();
      }

      this.locationService.eventPlatformReady.emit((typeof Device.platform == 'string') ? false : true); // object => ionic serve

      if (Device.platform == 'Android'){
        Insomnia.keepAwake();
      }


     
    
    });

  }
  ngAfterViewInit() {

  }

}
