import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core'
import * as moment from 'moment'

@Component({
    selector: 'meta-card',
    styleUrls: ['MetaCard.scss'],
    templateUrl: './MetaCard.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
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
