import { Injectable, EventEmitter } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class AlertService {
    eventNewAlert = new EventEmitter()
    eventDisplayToolTipRefreshData = new EventEmitter()
    displayToolTipRefreshData = false

    constructor() {}
}
