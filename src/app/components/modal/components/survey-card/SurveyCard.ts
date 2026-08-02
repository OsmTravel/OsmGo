import { Component, input, output } from '@angular/core'
import {
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
} from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'

@Component({
    selector: 'survey-card',
    styleUrls: ['SurveyCard.scss'],
    templateUrl: './SurveyCard.html',
    imports: [IonButton, IonCard, IonCardContent, IonIcon, TranslateModule],
})
export class SurveyCard {
    readonly yes = output<void>()
    readonly no = output<void>()

    readonly feature = input(undefined)

    handleYes() {
        this.yes.emit()
    }

    handleNo() {
        this.no.emit()
    }
}
