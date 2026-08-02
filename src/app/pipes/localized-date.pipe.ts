import { Pipe, type PipeTransform } from '@angular/core'

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseLocalizedDate(value: Date | number | string): Date | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value
    }

    if (typeof value === 'string') {
        const dateOnly = DATE_ONLY_PATTERN.exec(value)
        if (dateOnly) {
            const [, year, month, day] = dateOnly
            const parsed = new Date(
                Number(year),
                Number(month) - 1,
                Number(day)
            )
            if (
                Number.isNaN(parsed.getTime()) ||
                parsed.getFullYear() !== Number(year) ||
                parsed.getMonth() !== Number(month) - 1 ||
                parsed.getDate() !== Number(day)
            ) {
                return null
            }
            return parsed
        }
    }

    const normalizedValue =
        typeof value === 'number' && value > 0 && value < 100_000_000_000
            ? value * 1_000
            : value
    const parsed = new Date(normalizedValue)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatLocalizedDate(
    value: Date | number | string | null | undefined,
    locale?: string
): string {
    if (value === null || value === undefined || value === '') {
        return ''
    }

    const date = parseLocalizedDate(value)
    if (!date) {
        return ''
    }

    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date)
}

@Pipe({
    name: 'localizedDate',
})
export class LocalizedDatePipe implements PipeTransform {
    transform(
        value: Date | number | string | null | undefined,
        locale?: string
    ): string {
        return formatLocalizedDate(value, locale)
    }
}
