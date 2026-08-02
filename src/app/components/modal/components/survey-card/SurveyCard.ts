import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core'
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
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [IonButton, IonCard, IonCardContent, IonIcon, TranslateModule],
})
export class SurveyCard {
    readonly yes = output<void>()
    readonly no = output<void>()

    readonly feature = input(undefined)
    constructor() {}

    ngOnInit(): void {}

    handleYes() {
        this.yes.emit()
    }

    handleNo() {
        this.no.emit()
    }
}
