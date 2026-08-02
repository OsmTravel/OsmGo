import { Component, inject } from '@angular/core'
import { Router, RouterOutlet } from '@angular/router'
import { App, type URLOpenListenerEvent } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { SplashScreen } from '@capacitor/splash-screen'
import { AppStorage } from '@services/app-storage.service'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    imports: [RouterOutlet],
})
export class AppComponent {
    readonly configService = inject(ConfigService)
    readonly tagService = inject(TagsService)
    private readonly storage = inject(AppStorage)
    private readonly router = inject(Router)

    constructor() {
        this.initializeApp()
    }

    ngAfterViewInit(): void {
        SplashScreen.hide()
    }

    async initializeApp(): Promise<void> {
        await this.storage.ready()

        if (Capacitor.isPluginAvailable('App')) {
            App.addListener('appUrlOpen', (data: URLOpenListenerEvent) => {
                if (data.url.includes('osmgo://auth')) {
                    const urlParts = data.url.split('?')
                    if (urlParts.length > 1) {
                        const queryParams = '?' + urlParts[1]
                        this.router.navigateByUrl('/callback' + queryParams)
                    }
                }
            })
        }

        this.configService.platforms = Capacitor.isNativePlatform()
            ? ['hybrid', Capacitor.getPlatform()]
            : ['web']
        this.configService.deviceInfo = await Device.getInfo()

        await this.configService.loadAppVersion()
    }
}
