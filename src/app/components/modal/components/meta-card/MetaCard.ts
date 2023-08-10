import { Component, Input, Output, EventEmitter } from '@angular/core'
import * as moment from 'moment'

@Component({
    selector: 'meta-card',
    styleUrls: ['MetaCard.scss'],
    templateUrl: './MetaCard.html',
})
export class MetaCard {
    @Input() feature
    @Input() lastSurvey
    @Input() displayCode
    @Input() languageUi
    meta
    usedByWays
    constructor() {}

    ngOnInit(): void {
        this.usedByWays = this.feature.properties.usedByWays || null
        moment.locale(this.languageUi) // TODO Once...
    }
}
