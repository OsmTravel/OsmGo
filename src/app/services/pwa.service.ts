import { Injectable, HostListener } from '@angular/core'
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker'
import { filter, map } from 'rxjs'

@Injectable({
    providedIn: 'root',
})
export class PwaService {
    promptEvent

    constructor(private swUpdate: SwUpdate) {}

    updateAvailable() {
        const updatesAvailable = this.swUpdate.versionUpdates
            .pipe(
                filter(
                    (evt): evt is VersionReadyEvent =>
                        evt.type === 'VERSION_READY'
                ),
                map((evt) => ({
                    type: 'UPDATE_AVAILABLE',
                    current: evt.currentVersion,
                    available: evt.latestVersion,
                }))
            )
            .subscribe((event) => {
                console.log('PwaService', event)
                // if (askUserToUpdate()) {
                //   window.location.reload();
                // }
            })
    }
}
