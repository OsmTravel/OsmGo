import { ConfigService } from '@services/config.service'
import { Component } from '@angular/core'

import { Platform } from '@ionic/angular'

import { TranslateService } from '@ngx-translate/core'
import { TagsService } from '@services/tags.service'
import { Device } from '@capacitor/device'
import { Storage } from '@ionic/storage-angular'

import { SplashScreen } from '@capacitor/splash-screen'

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
})
export class AppComponent {
    constructor(
        private platform: Platform,
        public configService: ConfigService,
        private translate: TranslateService,
        public tagService: TagsService,
        private storage: Storage
    ) {
        this.initializeApp()
    }

    ngAfterViewInit(): void {
        SplashScreen.hide()
    }

    async initializeApp() {
        await this.storage.create()
        this.translate.setDefaultLang('en')
        this.configService.platforms = this.platform.platforms()
        this.configService.deviceInfo = await Device.getInfo()

        await this.configService.loadAppVersion()
    }
}
