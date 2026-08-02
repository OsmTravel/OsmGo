import { Component, computed, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { TranslateModule } from '@ngx-translate/core'
import { LocalizedDatePipe } from '@pipes/localized-date.pipe'
import { RelativeTimePipe } from '@pipes/relative-time.pipe'

interface MetaFeature {
    properties: {
        meta: {
            timestamp: number | string
            user?: string
            version: number
        }
        usedByWays?: boolean | unknown[]
    }
}

@Component({
    selector: 'meta-card',
    styleUrls: ['MetaCard.scss'],
    templateUrl: './MetaCard.html',
    imports: [
        LocalizedDatePipe,
        MatIconModule,
        RelativeTimePipe,
        TranslateModule,
    ],
})
export class MetaCard {
    readonly feature = input.required<MetaFeature>()
    readonly lastSurvey = input<Date>()
    readonly displayCode = input(false)
    readonly languageUi = input('en')
    readonly userLocale = computed(
        () =>
            globalThis.navigator?.languages?.[0] ||
            globalThis.navigator?.language ||
            this.languageUi()
    )
    readonly usedByWaysCount = computed(() => {
        const usedByWays = this.feature().properties.usedByWays
        if (Array.isArray(usedByWays)) {
            return usedByWays.length
        }
        return usedByWays ? 1 : 0
    })
}
