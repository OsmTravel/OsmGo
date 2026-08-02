import { Component, inject, input, model, OnInit, output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
    type InputCustomEvent,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    ModalController,
} from '@ionic/angular/standalone'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { MinutesToHoursMinutesPipe } from '@pipes/minutes-to-hours-minutes.pipe'
import DateRange from '@scripts/YoHours/DateRange.js'
import Interval from '@scripts/YoHours/Interval.js'
import OpeningHoursBuilder from '@scripts/YoHours/OpeningHoursBuilder.js'
import OpeningHoursParser from '@scripts/YoHours/OpeningHoursParser.js'
import WideInterval from '@scripts/YoHours/WideInterval.js'
import {
    ModalAddOpeningHoursIntervalComponent,
    type OpeningHoursDay,
    type OpeningHoursDialogResult,
    type OpeningHoursTime,
} from './modal-add-opening-hours-interval/modal-add-opening-hours-interval.component'

const parser = new OpeningHoursParser()
const builder = new OpeningHoursBuilder()

@Component({
    selector: 'app-opening-hours',
    templateUrl: './opening-hours.component.html',
    styleUrls: ['./opening-hours.component.scss', '../style.scss'],
    imports: [
        FormsModule,
        IonButton,
        IonIcon,
        IonInput,
        IonItem,
        MinutesToHoursMinutesPipe,
        TranslateModule,
    ],
})
export class OpeningHoursComponent implements OnInit {
    private readonly modalCtrl = inject(ModalController)
    private readonly translate = inject(TranslateService)

    readonly openingHours = model('')
    readonly displayCode = input(false)
    readonly editMode = input(false)

    readonly valueChangeEvent = output<string>()
    intervals: DateRange[] = []
    isError = false
    isTooComplex = false

    days = [
        { index: 0, text: this.translate.instant('DAYS.MONDAY') },
        { index: 1, text: this.translate.instant('DAYS.TUESDAY') },
        { index: 2, text: this.translate.instant('DAYS.WEDNESDAY') },
        { index: 3, text: this.translate.instant('DAYS.THURSDAY') },
        { index: 4, text: this.translate.instant('DAYS.FRIDAY') },
        { index: 5, text: this.translate.instant('DAYS.SATURDAY') },
        { index: 6, text: this.translate.instant('DAYS.SUNDAY') },
    ]

    valueChange(event: InputCustomEvent): void {
        this.valueChangeEvent.emit(String(event.detail.value ?? ''))
        this.parseOpeningHours()
    }

    parseOpeningHours(): void {
        try {
            this.intervals = parser.parse(this.openingHours())
            this.isError = false
            this.isTooComplex = false

            if (this.openingHours() == '') {
                this.isError = false
                return
            }

            /**
             * First iteration
             * Only Simple opening hours (without holydays, specifics days, weeks, etc...)
             * definesTypicalWeek(
             */

            if (this.intervals.length > 1) {
                this.isTooComplex = true
            } else if (this.intervals.length == 1) {
                if (!this.intervals[0].definesTypicalWeek())
                    this.isTooComplex = true
                else if (this.intervals[0].getInterval()._type !== 'always')
                    this.isTooComplex = true
                else this.isTooComplex = false
            }
        } catch (error) {
            this.isError = true
        }
    }

    ngOnInit(): void {
        this.parseOpeningHours()
    }

    findIntervalsByDay(intervals: Interval[], day: number): Interval[] {
        const intervalsByDay = intervals.filter(
            (interval) => interval._dayStart === day
        )
        return intervalsByDay
    }

    deleteCurrentInterval(dataRange: DateRange, interval: Interval): void {
        const wideIntervalType = dataRange._wideInterval._type
        const currentDataRange = this.intervals.find(
            (candidate) => candidate._wideInterval._type === wideIntervalType
        )
        if (!currentDataRange) return

        const intervals2 = currentDataRange.getTypical().getIntervals()

        const currentIntervalIndex = intervals2.findIndex(
            (candidate) =>
                candidate._dayStart === interval._dayStart &&
                candidate._dayEnd === interval._dayEnd &&
                candidate._start === interval._start &&
                candidate._end === interval._end
        )

        if (currentIntervalIndex >= 0) {
            currentDataRange.getTypical().removeInterval(currentIntervalIndex)
        }

        this.openingHours.set(builder.build(this.intervals))
        this.valueChangeEvent.emit(this.openingHours())
    }

    addIntervals(times: OpeningHoursTime[], days: OpeningHoursDay[]): void {
        const wideIntervalType = 'always'
        if (this.intervals.length === 0) {
            const wi = new WideInterval()
            this.intervals = [new DateRange(wi.always())]
        }

        const currentDataRange = this.intervals.find(
            (dateRange) => dateRange._wideInterval._type === wideIntervalType
        )
        if (!currentDataRange) return
        const daysIndex = days.filter((d) => d.selected).map((d) => d.index)

        for (const dayIndex of daysIndex) {
            for (const time of times) {
                const start = this.timeToMinutes(time.start)
                const end = this.timeToMinutes(time.end)
                let dayEnd = start > end ? dayIndex + 1 : dayIndex
                if (dayEnd == 7) dayEnd = 0
                currentDataRange
                    .getTypical()
                    .addInterval(new Interval(dayIndex, dayEnd, start, end))
            }
        }
        this.openingHours.set(builder.build(this.intervals))
        this.valueChangeEvent.emit(this.openingHours())
        this.parseOpeningHours()
    }

    timeToMinutes(time: string): number {
        const [hour, min] = time.split(':').map((t) => parseInt(t))
        return min + hour * 60
    }

    async openModalAddOpeningHours(
        data: Record<string, unknown> | null
    ): Promise<void> {
        const modal = await this.modalCtrl.create({
            component: ModalAddOpeningHoursIntervalComponent,
            componentProps: data ?? undefined,
        })
        await modal.present()

        const result = await modal.onDidDismiss<OpeningHoursDialogResult>()
        if (result.data) {
            this.addIntervals(result.data.times, result.data.days)
        }
    }
}
