import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
    IonBadge,
    IonButton,
    IonCard,
    IonContent,
    IonDatetime,
    IonFooter,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    ModalController,
} from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import { CharLimitPipe } from '@pipes/charLimit.pipe'

@Component({
    selector: 'app-modal-add-opening-hours-interval',
    templateUrl: './modal-add-opening-hours-interval.component.html',
    styleUrls: ['./modal-add-opening-hours-interval.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        CharLimitPipe,
        FormsModule,
        IonBadge,
        IonButton,
        IonCard,
        IonContent,
        IonDatetime,
        IonFooter,
        IonHeader,
        IonIcon,
        IonTitle,
        IonToolbar,
        TranslateModule,
    ],
})
export class ModalAddOpeningHoursIntervalComponent implements OnInit {
    private readonly modalCtrl = inject(ModalController)

    times = [{ start: '09:00', end: '12:00' }]

    days = [
        { index: 0, selected: false, label: 'DAYS.MONDAY' },
        { index: 1, selected: false, label: 'DAYS.TUESDAY' },
        { index: 2, selected: false, label: 'DAYS.WEDNESDAY' },
        { index: 3, selected: false, label: 'DAYS.THURSDAY' },
        { index: 4, selected: false, label: 'DAYS.FRIDAY' },
        { index: 5, selected: false, label: 'DAYS.SATURDAY' },
        { index: 6, selected: false, label: 'DAYS.SUNDAY' },
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
