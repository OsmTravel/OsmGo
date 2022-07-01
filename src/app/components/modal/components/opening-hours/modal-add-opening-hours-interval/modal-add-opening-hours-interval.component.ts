import { Component, OnInit } from '@angular/core'
import { ModalController, NavParams } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'

@Component({
    selector: 'app-modal-add-opening-hours-interval',
    templateUrl: './modal-add-opening-hours-interval.component.html',
    styleUrls: ['./modal-add-opening-hours-interval.component.scss'],
})
export class ModalAddOpeningHoursIntervalComponent implements OnInit {
    constructor(
        public params: NavParams,
        public modalCtrl: ModalController,
        private translate: TranslateService
    ) {}

    times = [{ start: '09:00', end: '12:00' }]

    days = [
        { index: 0, selected: false },
        { index: 1, selected: false },
        { index: 2, selected: false },
        { index: 3, selected: false },
        { index: 4, selected: false },
        { index: 5, selected: false },
        { index: 6, selected: false },
    ]

    dayIsSelected = false

    ngOnInit() {}

    timeChange(e) {
        const newTimeStr = e.detail.value
    }

    addNewInteval() {
        this.times = [...this.times, { start: '09:00', end: '12:00' }]
    }

    removeInteval(index) {
        this.times.splice(index, 1)
    }

    toggleDay(index) {
        this.days[index].selected = !this.days[index].selected
        this.dayIsSelected = this.days.map((d) => d.selected).includes(true)
    }

    cancel() {
        this.modalCtrl.dismiss(null)
    }

    submit(times, days) {
        this.modalCtrl.dismiss({ times, days })
    }
}
