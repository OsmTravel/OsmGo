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
        console.log('YES')
        this.yes.emit()
    }

    handleNo() {
        console.log('NO')
        this.no.emit()
    }
}
