import { enableProdMode } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'
import { AppComponent } from '@app/app.component'
import { appConfig } from '@app/app.config'
import { Capacitor } from '@capacitor/core'
import { environment } from '@environments/environment'

if (environment.production) {
    enableProdMode()
}

const unregisterNativeServiceWorkers = async (): Promise<void> => {
    if (!Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) {
        return
    }

    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
        registrations.map((registration) => registration.unregister())
    )
}

void unregisterNativeServiceWorkers()
    .catch((error) => {
        console.warn('Unable to unregister native service workers.', error)
    })
    .finally(() => {
        void bootstrapApplication(AppComponent, appConfig).catch((error) =>
            console.error(error)
        )
    })
