import { ChangeDetectionStrategy, Component } from '@angular/core'
import { Router } from '@angular/router'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { SplashScreen } from '@capacitor/splash-screen'
import { IonicModule, Platform } from '@ionic/angular'
import { Storage } from '@ionic/storage-angular'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [IonicModule],
})
export class AppComponent {
    constructor(
        private platform: Platform,
        public configService: ConfigService,
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

        this.configService.platforms = this.platform.platforms()
        this.configService.deviceInfo = await Device.getInfo()

        await this.configService.loadAppVersion()
    }
}
