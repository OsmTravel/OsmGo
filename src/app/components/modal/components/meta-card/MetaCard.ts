import { DatePipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input, input } from '@angular/core'
import { IonCard, IonCardContent } from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import { RelativeTimePipe } from '@pipes/relative-time.pipe'

@Component({
    selector: 'meta-card',
    styleUrls: ['MetaCard.scss'],
    templateUrl: './MetaCard.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        DatePipe,
        IonCard,
        IonCardContent,
        RelativeTimePipe,
        TranslateModule,
    ],
})
export class MetaCard {
    // TODO: Skipped for migration because:
    //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
    //  and migrating would break narrowing currently.
    @Input() feature
    // TODO: Skipped for migration because:
    //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
    //  and migrating would break narrowing currently.
    @Input() lastSurvey
    readonly displayCode = input(undefined)
    readonly languageUi = input(undefined)
    meta
    usedByWays

    ngOnInit(): void {
        this.usedByWays = this.feature.properties.usedByWays || null
    }
}
