import { TestBed } from '@angular/core/testing'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import {
    ModalAddOpeningHoursIntervalComponent,
    type OpeningHoursDialogData,
} from './modal-add-opening-hours-interval.component'

describe('ModalAddOpeningHoursIntervalComponent', () => {
    const dismiss = vi.fn()

    const createComponent = (
        data: OpeningHoursDialogData = { groups: [] }
    ): ModalAddOpeningHoursIntervalComponent => {
        TestBed.configureTestingModule({
            providers: [
                { provide: MatDialogRef, useValue: { close: dismiss } },
                { provide: MAT_DIALOG_DATA, useValue: data },
            ],
        })
        return TestBed.runInInjectionContext(
            () => new ModalAddOpeningHoursIntervalComponent()
        )
    }

    beforeEach(() => {
        TestBed.resetTestingModule()
        dismiss.mockReset()
    })

    it('updates a time range from a native time value', () => {
        const component = createComponent()
        const group = component.groups()[0]

        component.updateTimeRange(group.id, group.times[0].id, 'start', '10:30')

        expect(component.groups()[0].times[0].start).toBe('10:30')
    })

    it('creates multiple independent day groups in one submission', () => {
        const component = createComponent()
        const weekGroup = component.groups()[0]

        component.toggleDay(weekGroup.id, 1)
        component.toggleDay(weekGroup.id, 2)
        component.updateTimeRange(
            weekGroup.id,
            weekGroup.times[0].id,
            'start',
            '08:00'
        )
        component.addNewInterval(weekGroup.id)
        const afternoon = component.groups()[0].times[1]
        component.updateTimeRange(weekGroup.id, afternoon.id, 'start', '14:00')
        component.updateTimeRange(weekGroup.id, afternoon.id, 'end', '18:00')

        component.addScheduleGroup()
        const saturdayGroup = component.groups()[1]
        component.toggleDay(saturdayGroup.id, 5)
        component.updateTimeRange(
            saturdayGroup.id,
            saturdayGroup.times[0].id,
            'end',
            '11:30'
        )
        component.submit()

        expect(component.groupsAreValid()).toBe(true)
        expect(dismiss).toHaveBeenCalledWith({
            groups: [
                {
                    days: expect.arrayContaining([
                        expect.objectContaining({ index: 1, selected: true }),
                        expect.objectContaining({ index: 2, selected: true }),
                    ]),
                    times: [
                        { start: '08:00', end: '12:00' },
                        { start: '14:00', end: '18:00' },
                    ],
                },
                {
                    days: expect.arrayContaining([
                        expect.objectContaining({ index: 5, selected: true }),
                    ]),
                    times: [{ start: '09:00', end: '11:30' }],
                },
            ],
        })
    })

    it('loads existing opening hours for editing', () => {
        const component = createComponent({
            groups: [
                {
                    days: [{ index: 1, selected: true, label: 'DAYS.TUESDAY' }],
                    times: [{ start: '08:00', end: '12:00' }],
                },
            ],
        })

        expect(component.groups()[0].days[1].selected).toBe(true)
        expect(component.groups()[0].times[0]).toEqual(
            expect.objectContaining({ start: '08:00', end: '12:00' })
        )
    })
})
