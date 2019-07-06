import { ConfigService } from './services/config.service';
import { LocationService } from './services/location.service';
import { Component } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TagsService } from './services/tags.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private locationService: LocationService,
    public configService: ConfigService,
    private translate: TranslateService,
    public tagService: TagsService
  ) {


    this.initializeApp();
  }

  initializeApp() {


    this.translate.setDefaultLang('en');
 
    this.configService.platforms = this.platform.platforms();


    ;
    this.platform.ready()
      .then(() => {
        this.configService.loadAppVersion();
        this.splashScreen.hide();
        this.locationService.eventPlatformReady.emit(true); // object => == 1 => ionic serve ( ['core'])
      });






  }
}
