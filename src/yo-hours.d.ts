declare module '@scripts/YoHours/Interval.js' {
    export default class Interval {
        readonly _dayStart: number
        readonly _dayEnd: number
        readonly _start: number
        readonly _end: number

        constructor(
            dayStart: number,
            dayEnd: number,
            minuteStart: number,
            minuteEnd: number
        )
    }
}

declare module '@scripts/YoHours/WideInterval.js' {
    export default class WideInterval {
        readonly _type: string
        always(): WideInterval
        equals(other: WideInterval | { _type: string }): boolean
        holiday(value: 'PH' | 'SH' | 'easter'): WideInterval
    }
}

declare module '@scripts/YoHours/DateRange.js' {
    import type Interval from '@scripts/YoHours/Interval.js'
    import type WideInterval from '@scripts/YoHours/WideInterval.js'

    interface TypicalWeek {
        _intervals: Interval[]
        addInterval(interval: Interval): void
        getIntervals(): Interval[]
        removeInterval(index: number): void
    }

    export default class DateRange {
        readonly _wideInterval: WideInterval
        readonly _typical: TypicalWeek

        constructor(interval: WideInterval)
        definesTypicalWeek(): boolean
        getInterval(): WideInterval
        getTypical(): TypicalWeek
    }
}

declare module '@scripts/YoHours/OpeningHoursBuilder.js' {
    import type DateRange from '@scripts/YoHours/DateRange.js'

    export default class OpeningHoursBuilder {
        build(dateRanges: DateRange[]): string
    }
}

declare module '@scripts/YoHours/OpeningHoursParser.js' {
    import type DateRange from '@scripts/YoHours/DateRange.js'

    export default class OpeningHoursParser {
        parse(value: string): DateRange[]
    }
}

declare module '@scripts/YoHours/OhDate.js' {
    export default class OhDate {
        constructor(wide: string, wideType: string, weekdays: number[])
    }
}

declare module '@scripts/YoHours/OhRule.js' {
    export default class OhRule {
        addDate(date: unknown): void
    }
}
