import { Injectable, EventEmitter } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class AlertService {
    eventNewAlert = new EventEmitter<string>()
    eventDisplayToolTipRefreshData = new EventEmitter<void>()
    displayToolTipRefreshData: boolean = false

    constructor() {}
}
