import { ConfigService } from '@services/config.service'
import { Component } from '@angular/core'

import { Platform } from '@ionic/angular'

import { TranslateService } from '@ngx-translate/core'
import { TagsService } from '@services/tags.service'
import { Device } from '@capacitor/device'
import { Storage } from '@ionic/storage-angular'

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

import { SplashScreen } from '@capacitor/splash-screen'
import { Router } from '@angular/router'
import { OsmAuthService } from './services/osm-auth.service'
import { URLOpenListenerEvent } from '@capacitor/app'

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
        private storage: Storage,
        private router: Router
    ) {
        this.initializeApp()
    }

    ngAfterViewInit(): void {
        SplashScreen.hide()
    }

    async initializeApp() {
        await this.storage.create()

        this.platform.ready().then(() => {
            if (Capacitor.isPluginAvailable('App')) {
                App.addListener('appUrlOpen', (data: any) => {
                    console.log('appUrlOpen')
                    if (data.url.includes('osmgo://auth')) {
                        const urlParts = data.url.split('?')
                        if (urlParts.length > 1) {
                            const queryParams = '?' + urlParts[1]
                            this.router.navigateByUrl('/callback' + queryParams)
                        }
                    }
                })
            }
        })

        this.translate.setDefaultLang('en')
        this.configService.platforms = this.platform.platforms()
        this.configService.deviceInfo = await Device.getInfo()

        await this.configService.loadAppVersion()
    }
}
