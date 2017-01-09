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
      let test = Device.uuid;
      console.log(typeof Device.platform)



      if (typeof Device.platform == 'string'){
        this.configService.loadAppVersion();
      }
      //loadAppVersion
      console.log(Device);
      this.locationService.eventPlatformReady.emit((typeof Device.platform == 'string') ? false : true); // object => ionic serve
       //this.locationService.eventPlatformReady.emit(true);
      Insomnia.keepAwake()
        .then(
        () => console.log('Insomnia success'),
        () => console.log('Insomnia error')
        );


      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      Splashscreen.hide();
      StatusBar.styleDefault();
    });

  }
  ngAfterViewInit() {

  }

}
