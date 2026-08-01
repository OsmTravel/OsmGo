import { Pipe, type PipeTransform } from '@angular/core'

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MONTH = 30 * DAY
const YEAR = 365 * DAY

@Pipe({
    name: 'relativeTime',
})
export class RelativeTimePipe implements PipeTransform {
    transform(
        value: Date | number | string | null | undefined,
        locale?: string
    ): string {
        if (value === null || value === undefined || value === '') {
            return ''
        }

        const date = value instanceof Date ? value : new Date(value)
        if (Number.isNaN(date.getTime())) {
            return ''
        }

        const difference = date.getTime() - Date.now()
        const { amount, unit } = this.getRelativeValue(difference)

        return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
            amount,
            unit
        )
    }

    private getRelativeValue(difference: number): {
        amount: number
        unit: Intl.RelativeTimeFormatUnit
    } {
        const absoluteDifference = Math.abs(difference)

        if (absoluteDifference >= YEAR) {
            return { amount: this.round(difference, YEAR), unit: 'year' }
        }
        if (absoluteDifference >= MONTH) {
            return { amount: this.round(difference, MONTH), unit: 'month' }
        }
        if (absoluteDifference >= DAY) {
            return { amount: this.round(difference, DAY), unit: 'day' }
        }
        if (absoluteDifference >= HOUR) {
            return { amount: this.round(difference, HOUR), unit: 'hour' }
        }
        if (absoluteDifference >= MINUTE) {
            return { amount: this.round(difference, MINUTE), unit: 'minute' }
        }

        return { amount: this.round(difference, SECOND), unit: 'second' }
    }

    private round(value: number, unit: number): number {
        return Math.sign(value) * Math.round(Math.abs(value) / unit)
    }
}
