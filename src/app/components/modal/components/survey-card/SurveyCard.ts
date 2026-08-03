import { Component, input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { TranslateModule } from '@ngx-translate/core'
import type { OsmGoFeature } from '@osmgo/type'

@Component({
    selector: 'survey-card',
    styleUrls: ['SurveyCard.scss'],
    templateUrl: './SurveyCard.html',
    imports: [MatButtonModule, MatIconModule, TranslateModule],
})
export class SurveyCard {
    readonly yes = output<void>()
    readonly no = output<void>()

    readonly feature = input.required<OsmGoFeature>()
    readonly disabled = input(false)

    handleYes(): void {
        this.yes.emit()
    }

    handleNo(): void {
        this.no.emit()
    }
}
