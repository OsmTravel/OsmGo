import { Component, Input, Output, EventEmitter } from '@angular/core'

@Component({
    selector: 'survey-card',
    styleUrls: ['SurveyCard.scss'],
    templateUrl: './SurveyCard.html',
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
