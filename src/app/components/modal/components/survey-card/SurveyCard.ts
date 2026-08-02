import { Component, input, output } from '@angular/core'
import {
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
} from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import type { OsmGoFeature } from '@osmgo/type'

@Component({
    selector: 'survey-card',
    styleUrls: ['SurveyCard.scss'],
    templateUrl: './SurveyCard.html',
    imports: [IonButton, IonCard, IonCardContent, IonIcon, TranslateModule],
})
export class SurveyCard {
    readonly yes = output<void>()
    readonly no = output<void>()

    readonly feature = input.required<OsmGoFeature>()

    handleYes(): void {
        this.yes.emit()
    }

    handleNo(): void {
        this.no.emit()
    }
}
