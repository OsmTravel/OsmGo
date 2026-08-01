import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

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

    ngOnInit(): void {
        this.usedByWays = this.feature.properties.usedByWays || null
    }
}
