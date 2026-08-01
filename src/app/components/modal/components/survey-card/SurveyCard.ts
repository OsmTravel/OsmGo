import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'

@Component({
    selector: 'survey-card',
    styleUrls: ['SurveyCard.scss'],
    templateUrl: './SurveyCard.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [IonicModule, TranslateModule],
})
export class SurveyCard {
    @Output() yes = new EventEmitter()
    @Output() no = new EventEmitter()

    @Input() feature
    constructor() {}

    ngOnInit(): void {}

    handleYes() {
        this.yes.emit()
    }

    handleNo() {
        this.no.emit()
    }
}
