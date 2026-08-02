import {
    provideHttpClient,
    withInterceptorsFromDi,
    withXhr,
} from '@angular/common/http'
import {
    ApplicationConfig,
    importProvidersFrom,
    provideZoneChangeDetection,
} from '@angular/core'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { provideRouter, RouteReuseStrategy } from '@angular/router'
import { provideServiceWorker } from '@angular/service-worker'
import { routes } from '@app/app.routes'
import { environment } from '@environments/environment'
import {
    IonicRouteStrategy,
    provideIonicAngular,
} from '@ionic/angular/standalone'
import { IonicStorageModule } from '@ionic/storage-angular'
import { TranslateModule } from '@ngx-translate/core'
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader'

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideZoneChangeDetection(),
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        provideServiceWorker('ngsw-worker.js', {
            enabled: environment.production,
        }),
        provideTranslateHttpLoader({ prefix: './assets/i18n/' }),
        importProvidersFrom(
            BrowserAnimationsModule,
            IonicStorageModule.forRoot(),
            TranslateModule.forRoot({ fallbackLang: 'en' })
        ),
        provideIonicAngular({ mode: 'md' }),
    ],
}
