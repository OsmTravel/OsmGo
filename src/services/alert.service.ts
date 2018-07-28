import { Injectable, EventEmitter } from '@angular/core';

@Injectable()
export class AlertService {
    eventNewAlert = new EventEmitter();
    eventDisplayToolTipRefreshData = new EventEmitter();
    displayToolTipRefreshData = false;

    constructor() {

    }


}
