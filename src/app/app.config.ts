import {
    provideHttpClient,
    withInterceptorsFromDi,
    withXhr,
} from '@angular/common/http'
import { ApplicationConfig, provideCheckNoChangesConfig } from '@angular/core'
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import { provideRouter } from '@angular/router'
import { provideServiceWorker } from '@angular/service-worker'
import { routes } from '@app/app.routes'
import { environment } from '@environments/environment'
import { provideTranslateService } from '@ngx-translate/core'
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader'

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        ...(environment.production
            ? []
            : [
                  provideCheckNoChangesConfig({
                      exhaustive: true,
                      interval: 1000,
                  }),
              ]),
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        provideAnimationsAsync(),
        provideServiceWorker('ngsw-worker.js', {
            enabled: environment.production,
        }),
        provideTranslateService({
            fallbackLang: 'en',
            loader: provideTranslateHttpLoader({ prefix: './assets/i18n/' }),
        }),
    ],
}
