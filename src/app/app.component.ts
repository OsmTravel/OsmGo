import { ConfigService } from './services/config.service';
import { LocationService } from './services/location.service';
import { Component } from '@angular/core';

import { Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';
import { TagsService } from './services/tags.service';
import { StatesService } from './services/states.service';

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
    public tagService: TagsService,
    public statesService: StatesService

  ) {
    this.initializeApp();

  }

  async initializeApp() {
    this.translate.setDefaultLang('en');
    this.configService.platforms = this.platform.platforms();
    this.configService.loadAppVersion();

    this.platform.backButton
    .subscribe(e => {
      console.log(e)
    })
  }


}
