import { Component, computed, inject, signal } from '@angular/core'
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
import type { DatetimeChangeEventDetail } from '@ionic/core'
import { TranslateModule } from '@ngx-translate/core'
import { CharLimitPipe } from '@pipes/charLimit.pipe'

export interface OpeningHoursTime {
    start: string
    end: string
}

interface OpeningHoursTimeRange extends OpeningHoursTime {
    id: number
}

export interface OpeningHoursDay {
    index: number
    selected: boolean
    label: string
}

export interface OpeningHoursDialogResult {
    times: OpeningHoursTime[]
    days: OpeningHoursDay[]
}

@Component({
    selector: 'app-modal-add-opening-hours-interval',
    templateUrl: './modal-add-opening-hours-interval.component.html',
    styleUrls: ['./modal-add-opening-hours-interval.component.scss'],
    imports: [
        CharLimitPipe,
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
export class ModalAddOpeningHoursIntervalComponent {
    private readonly modalCtrl = inject(ModalController)
    private nextTimeRangeId = 1

    readonly times = signal<OpeningHoursTimeRange[]>([
        { id: 0, start: '09:00', end: '12:00' },
    ])

    readonly days = signal<OpeningHoursDay[]>([
        { index: 0, selected: false, label: 'DAYS.MONDAY' },
        { index: 1, selected: false, label: 'DAYS.TUESDAY' },
        { index: 2, selected: false, label: 'DAYS.WEDNESDAY' },
        { index: 3, selected: false, label: 'DAYS.THURSDAY' },
        { index: 4, selected: false, label: 'DAYS.FRIDAY' },
        { index: 5, selected: false, label: 'DAYS.SATURDAY' },
        { index: 6, selected: false, label: 'DAYS.SUNDAY' },
    ])

    readonly dayIsSelected = computed(() =>
        this.days().some((day) => day.selected)
    )

    updateTimeRange(
        index: number,
        field: 'start' | 'end',
        event: CustomEvent<DatetimeChangeEventDetail>
    ): void {
        const value = event.detail.value
        if (typeof value !== 'string') {
            return
        }
        this.times.update((times) =>
            times.map((time, currentIndex) =>
                currentIndex === index ? { ...time, [field]: value } : time
            )
        )
    }

    addNewInteval(): void {
        this.times.update((times) => [
            ...times,
            {
                id: this.nextTimeRangeId++,
                start: '09:00',
                end: '12:00',
            },
        ])
    }

    removeInteval(index: number): void {
        this.times.update((times) =>
            times.filter((_, currentIndex) => currentIndex !== index)
        )
    }

    toggleDay(index: number): void {
        this.days.update((days) =>
            days.map((day) =>
                day.index === index ? { ...day, selected: !day.selected } : day
            )
        )
    }

    cancel(): void {
        this.modalCtrl.dismiss(null)
    }

    submit(): void {
        const times = this.times().map(({ start, end }) => ({ start, end }))
        this.modalCtrl.dismiss({ times, days: this.days() })
    }
}
