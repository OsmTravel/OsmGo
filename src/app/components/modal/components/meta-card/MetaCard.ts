import { DatePipe } from '@angular/common'
import { Component, computed, input } from '@angular/core'
import { IonCard, IonCardContent } from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import { RelativeTimePipe } from '@pipes/relative-time.pipe'

interface MetaFeature {
    properties: {
        meta: {
            timestamp: number | string
            user?: string
            version: number
        }
        usedByWays?: unknown[]
    }
}

@Component({
    selector: 'meta-card',
    styleUrls: ['MetaCard.scss'],
    templateUrl: './MetaCard.html',
    imports: [
        DatePipe,
        IonCard,
        IonCardContent,
        RelativeTimePipe,
        TranslateModule,
    ],
})
export class MetaCard {
    readonly feature = input.required<MetaFeature>()
    readonly lastSurvey = input<Date>()
    readonly displayCode = input(undefined)
    readonly languageUi = input(undefined)
    readonly usedByWays = computed(
        () => this.feature().properties.usedByWays || null
    )
}
