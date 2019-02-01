import { ConfigService } from './services/config.service';
import { LocationService } from './services/location.service';
import { Component } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private locationService: LocationService,
    public configService: ConfigService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.configService.platforms = this.platform.platforms();

    this.platform.ready().then(() => {
      this.splashScreen.hide();
      // this.statusBar.styleDefault();
      this.locationService.eventPlatformReady.emit(true); // object => == 1 => ionic serve ( ['core'])
    });
  }
}
