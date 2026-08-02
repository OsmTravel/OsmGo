import { DatePipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
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
