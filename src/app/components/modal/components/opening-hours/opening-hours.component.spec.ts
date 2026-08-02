import { TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { TranslateService } from '@ngx-translate/core'
import DateRange from '@scripts/YoHours/DateRange.js'
import Interval from '@scripts/YoHours/Interval.js'
import WideInterval from '@scripts/YoHours/WideInterval.js'
import { OpeningHoursComponent } from './opening-hours.component'

describe('OpeningHoursComponent', () => {
    it('deletes an interval only from its matching date range', () => {
        TestBed.configureTestingModule({
            providers: [
                { provide: MatDialog, useValue: {} },
                {
                    provide: TranslateService,
                    useValue: { instant: (key: string) => key },
                },
            ],
        })
        const component = TestBed.runInInjectionContext(
            () => new OpeningHoursComponent()
        )
        const weeklyRange = new DateRange(new WideInterval().always())
        const holidayRange = new DateRange(new WideInterval().holiday('PH'))
        const weeklyInterval = new Interval(0, 0, 540, 720)
        const holidayInterval = new Interval(0, 0, 600, 660)
        weeklyRange.getTypical().addInterval(weeklyInterval)
        holidayRange.getTypical().addInterval(holidayInterval)
        component.intervals = [weeklyRange, holidayRange]

        component.deleteCurrentInterval(holidayRange, holidayInterval)

        expect(weeklyRange.getTypical().getIntervals()).toContain(
            weeklyInterval
        )
        expect(holidayRange.getTypical().getIntervals()).not.toContain(
            holidayInterval
        )
    })
})
