import { TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { TranslateService } from '@ngx-translate/core'
import DateRange from '@scripts/YoHours/DateRange.js'
import Interval from '@scripts/YoHours/Interval.js'
import WideInterval from '@scripts/YoHours/WideInterval.js'
import type { OpeningHoursScheduleGroup } from './modal-add-opening-hours-interval/modal-add-opening-hours-interval.component'
import { OpeningHoursComponent } from './opening-hours.component'

describe('OpeningHoursComponent', () => {
    const createComponent = (): OpeningHoursComponent => {
        TestBed.configureTestingModule({
            providers: [
                { provide: MatDialog, useValue: {} },
                {
                    provide: TranslateService,
                    useValue: { instant: (key: string) => key },
                },
            ],
        })
        return TestBed.runInInjectionContext(() => new OpeningHoursComponent())
    }

    beforeEach(() => TestBed.resetTestingModule())

    it('deletes an interval only from its matching date range', () => {
        const component = createComponent()
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

    it('replaces a complete weekly schedule with several day groups', () => {
        const component = createComponent()
        const day = (index: number, selected: boolean) => ({
            index,
            selected,
            label: `DAYS.${index}`,
        })
        const days = (selected: number[]) =>
            Array.from({ length: 7 }, (_, index) =>
                day(index, selected.includes(index))
            )
        const groups: OpeningHoursScheduleGroup[] = [
            {
                days: days([1, 2]),
                times: [
                    { start: '08:00', end: '12:00' },
                    { start: '14:00', end: '18:00' },
                ],
            },
            {
                days: days([5]),
                times: [{ start: '09:00', end: '11:30' }],
            },
        ]

        component.replaceScheduleGroups(groups)

        const intervals = component.intervals[0].getTypical().getIntervals()
        expect(component.openingHours()).toContain('Tu')
        expect(component.openingHours()).toContain('Sa')
        expect(
            intervals.filter((interval) => interval._dayStart === 1)
        ).toHaveLength(2)
        expect(
            intervals.filter((interval) => interval._dayStart === 2)
        ).toHaveLength(2)
        expect(
            intervals.filter((interval) => interval._dayStart === 5)
        ).toEqual([expect.objectContaining({ _start: 540, _end: 690 })])
    })

    it('groups days sharing the same intervals when editing', () => {
        const component = createComponent()
        component.openingHours.set(
            'Tu-We 08:00-12:00,14:00-18:00; Sa 09:00-11:30'
        )
        component.parseOpeningHours()

        const groups = component.getScheduleGroups()

        expect(groups).toHaveLength(2)
        expect(
            groups.find((group) => group.days[1].selected)?.days[2].selected
        ).toBe(true)
        expect(groups.find((group) => group.days[5].selected)?.times).toEqual([
            { start: '09:00', end: '11:30' },
        ])
    })
})
