import { ConfigService } from './services/config.service';
import { LocationService } from './services/location.service';
import { Component } from '@angular/core';

import { Platform } from '@ionic/angular';
import { Plugins } from '@capacitor/core';
const { SplashScreen, Device } = Plugins;

import { TranslateService } from '@ngx-translate/core';
import { TagsService } from './services/tags.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private locationService: LocationService,
    public configService: ConfigService,
    private translate: TranslateService,
    public tagService: TagsService
  ) {


    this.initializeApp();
  }

  async initializeApp() {
    this.translate.setDefaultLang('en');
    const info = await Device.getInfo();
    console.log(info);

    this.configService.platforms = this.platform.platforms();

    SplashScreen.show({
      autoHide: false
    });


    ;
    this.platform.ready()
      .then(() => {
        this.configService.loadAppVersion();
        SplashScreen.hide();
        this.locationService.eventPlatformReady.emit(true); // object => == 1 => ionic serve ( ['core'])
      });






  }
}
