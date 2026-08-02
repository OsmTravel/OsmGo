import { TestBed } from '@angular/core/testing'
import { ModalController } from '@ionic/angular/standalone'
import type { DatetimeChangeEventDetail } from '@ionic/core'
import { ModalAddOpeningHoursIntervalComponent } from './modal-add-opening-hours-interval.component'

describe('ModalAddOpeningHoursIntervalComponent', () => {
    const dismiss = vi.fn()

    const createComponent = (): ModalAddOpeningHoursIntervalComponent => {
        TestBed.configureTestingModule({
            providers: [{ provide: ModalController, useValue: { dismiss } }],
        })
        return TestBed.runInInjectionContext(
            () => new ModalAddOpeningHoursIntervalComponent()
        )
    }

    beforeEach(() => {
        TestBed.resetTestingModule()
        dismiss.mockReset()
    })

    it('updates a time range from an Ionic event', () => {
        const component = createComponent()
        const event = {
            detail: { value: '10:30' },
        } as CustomEvent<DatetimeChangeEventDetail>

        component.updateTimeRange(0, 'start', event)

        expect(component.times()[0].start).toBe('10:30')
    })

    it('requires a selected day and submits clean time ranges', () => {
        const component = createComponent()

        expect(component.dayIsSelected()).toBe(false)

        component.toggleDay(0)
        component.submit()

        expect(component.dayIsSelected()).toBe(true)
        expect(dismiss).toHaveBeenCalledWith({
            times: [{ start: '09:00', end: '12:00' }],
            days: component.days(),
        })
    })
})
