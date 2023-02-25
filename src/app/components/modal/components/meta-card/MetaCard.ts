import { Component, Input, Output, EventEmitter } from '@angular/core'
import * as moment from 'moment'

@Component({
    selector: 'meta-card',
    styleUrls: ['MetaCard.scss'],
    templateUrl: './MetaCard.html',
})
export class MetaCard {
    @Output() confirmPresence = new EventEmitter()

    @Input() feature
    @Input() displayCode
    @Input() languageUi
    @Input() mapService
    meta
    usedByWays
    constructor() {}

    ngOnInit(): void {
        this.usedByWays = this.feature.properties.usedByWays || null
        moment.locale(this.languageUi) // TODO Once...
    }

    emitConfirmPresence() {
        if (this.feature.properties['changeType']) return
        this.confirmPresence.emit()
    }
}
