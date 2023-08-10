import { Injectable, HostListener } from '@angular/core'
import { SwUpdate } from '@angular/service-worker'

@Injectable({
    providedIn: 'root',
})
export class PwaService {
    promptEvent

    constructor(private swUpdate: SwUpdate) {}

    updateAvailable() {
        this.swUpdate.available.subscribe((event) => {
            console.log('PwaService', event)
            // if (askUserToUpdate()) {
            //   window.location.reload();
            // }
        })
    }
}
