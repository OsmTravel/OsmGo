import { Injectable, EventEmitter } from '@angular/core';

@Injectable()
export class AlertService {
    eventNewAlert = new EventEmitter();

    constructor() {

    }


}
