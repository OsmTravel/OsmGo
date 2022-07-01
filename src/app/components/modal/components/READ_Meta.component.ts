import { Component, Input } from '@angular/core'
import * as moment from 'moment'

@Component({
    selector: 'read-meta',
    templateUrl: './READ_Meta.component.html',
})
export class ReadMeta {
    @Input() feature
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
