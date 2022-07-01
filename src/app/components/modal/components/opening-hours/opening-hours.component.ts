import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import * as Interval from '../../../../../../scripts/YoHours/Interval.js'
import * as OpeningHoursParser from '../../../../../../scripts/YoHours/OpeningHoursParser.js'
import * as OpeningHoursBuilder from '../../../../../../scripts/YoHours/OpeningHoursBuilder.js'
import * as DateRange from '../../../../../../scripts/YoHours/DateRange.js'
import * as WideInterval from '../../../../../../scripts/YoHours/WideInterval.js'
import { TranslateService } from '@ngx-translate/core'

import { ModalController } from '@ionic/angular'
import { ModalAddOpeningHoursIntervalComponent } from './modal-add-opening-hours-interval/modal-add-opening-hours-interval.component'

const parser = new OpeningHoursParser()
const builder = new OpeningHoursBuilder()

@Component({
    selector: 'app-opening-hours',
    templateUrl: './opening-hours.component.html',
    styleUrls: ['./opening-hours.component.scss', '../style.scss'],
})
export class OpeningHoursComponent implements OnInit {
    @Input() openingHours
    @Input() displayCode
    @Input() editMode = false

    @Output() valueChangeEvent = new EventEmitter()

    constructor(
        public modalCtrl: ModalController,
        private translate: TranslateService
    ) {}
    intervals: any
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

    valueChange(e) {
        this.valueChangeEvent.emit(e.target.value)
        this.parseOpeningHours()
    }

    parseOpeningHours() {
        try {
            this.intervals = parser.parse(this.openingHours)
            this.isError = false
            this.isTooComplex = false

            if (this.openingHours == '') {
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

    ngOnInit() {
        this.parseOpeningHours()
    }

    findIntervalsByDay(intervals, day) {
        const intervalsByDay = intervals.filter(
            (interval) => interval && interval._dayStart == day
        )
        return intervalsByDay
    }

    deleteCurrentInterval(_dataRange, _interval) {
        const _wideIntervalType = _dataRange._wideInterval._type
        const currentDataRange = this.intervals.find(
            (dr) => (dr._wideInterval._type = _wideIntervalType)
        )

        const intervals2 = currentDataRange.getTypical().getIntervals()

        const currentIntervalIndex = intervals2.findIndex(
            (int) =>
                int &&
                int._dayStart == _interval._dayStart &&
                int._dayEnd == _interval._dayEnd &&
                int._start == _interval._start &&
                int._end == _interval._end
        )

        currentDataRange.getTypical().removeInterval(currentIntervalIndex)

        this.openingHours = builder.build(this.intervals)
        this.valueChangeEvent.emit(this.openingHours)
    }

    addIntervals(times, days) {
        const _wideIntervalType = 'always'
        if (!this.intervals || this.intervals.length == 0) {
            const wi = new WideInterval()
            this.intervals = [new DateRange(wi.always())]
        }

        const currentDataRange = this.intervals.find(
            (dr) => (dr._wideInterval._type = _wideIntervalType)
        )
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
        this.openingHours = builder.build(this.intervals)
        this.valueChangeEvent.emit(this.openingHours)
        this.parseOpeningHours()
    }

    timeToMinutes(time: string): number {
        const [hour, min] = time.split(':').map((t) => parseInt(t))
        return min + hour * 60
    }

    async openModalAddOpeningHours(data) {
        const modal = await this.modalCtrl.create({
            component: ModalAddOpeningHoursIntervalComponent,
            componentProps: data,
        })
        await modal.present()

        modal.onDidDismiss().then((d) => {
            const _data = d.data
            if (_data) {
                this.addIntervals(_data.times, _data.days)
            }
        })
    }
}
