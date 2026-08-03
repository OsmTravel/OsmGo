import { Component, inject, type OnDestroy } from '@angular/core'
import { Router, RouterOutlet } from '@angular/router'
import { App, type URLOpenListenerEvent } from '@capacitor/app'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
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
export class AppComponent implements OnDestroy {
    readonly configService = inject(ConfigService)
    readonly tagService = inject(TagsService)
    private readonly storage = inject(AppStorage)
    private readonly router = inject(Router)
    private appUrlOpenListener?: PluginListenerHandle

    constructor() {
        this.initializeApp()
    }

    ngAfterViewInit(): void {
        SplashScreen.hide()
    }

    async initializeApp(): Promise<void> {
        await this.storage.ready()

        if (Capacitor.isPluginAvailable('App')) {
            this.appUrlOpenListener = await App.addListener(
                'appUrlOpen',
                (data: URLOpenListenerEvent) => {
                    let callback: URL
                    try {
                        callback = new URL(data.url)
                    } catch {
                        return
                    }
                    if (
                        callback.protocol !== 'osmgo:' ||
                        callback.hostname !== 'auth'
                    ) {
                        return
                    }
                    void this.router.navigate(['/'], {
                        queryParams: {
                            ...Object.fromEntries(callback.searchParams),
                            nativeOAuthCallbackUrl: callback.href,
                        },
                    })
                }
            )
        }

        this.configService.platforms = Capacitor.isNativePlatform()
            ? ['hybrid', Capacitor.getPlatform()]
            : ['web']
        this.configService.deviceInfo = await Device.getInfo()

        await this.configService.loadAppVersion()
    }

    ngOnDestroy(): void {
        void this.appUrlOpenListener?.remove()
    }
}
