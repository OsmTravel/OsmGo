import { Service } from '@angular/core'
import { Subject } from 'rxjs'

@Service()
export class AlertService {
    private readonly newAlertSubject = new Subject<string>()
    readonly newAlert$ = this.newAlertSubject.asObservable()
    private readonly displayRefreshTooltipSubject = new Subject<void>()
    readonly displayRefreshTooltip$ =
        this.displayRefreshTooltipSubject.asObservable()
    displayToolTipRefreshData: boolean = false

    showAlert(message: string): void {
        this.newAlertSubject.next(message)
    }

    requestRefreshTooltip(): void {
        this.displayRefreshTooltipSubject.next()
    }
}
