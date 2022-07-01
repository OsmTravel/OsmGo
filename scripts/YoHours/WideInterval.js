/*
 * This file is part of YoHours.
 *
 * YoHours is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * YoHours is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with YoHours.  If not, see <http://www.gnu.org/licenses/>.
 */

//IMPORTS
let Constants = require('./Constants')

/**
 * A wide interval is an interval of one or more days, weeks, months, holidays.
 * Use WideInterval.days/weeks/months/holidays methods to construct one object.
 */
class WideInterval {
    //CONSTRUCTOR
    constructor() {
        /** The start of the interval **/
        this._start = null

        /** The end of the interval **/
        this._end = null

        /** The kind of interval **/
        this._type = null
    }

    //CONSTRUCTORS
    /**
     * @return a day-based interval
     */
    day(startDay, startMonth, endDay, endMonth) {
        if (startDay == null || startMonth == null) {
            throw Error("Start day and month can't be null")
        }
        this._start = { day: startDay, month: startMonth }
        this._end =
            endDay != null &&
            endMonth != null &&
            (endDay != startDay || endMonth != startMonth)
                ? { day: endDay, month: endMonth }
                : null
        this._type = 'day'
        return this
    }

    /**
     * @return a week-based interval
     */
    week(startWeek, endWeek) {
        if (startWeek == null) {
            throw Error("Start week can't be null")
        }
        this._start = { week: startWeek }
        this._end =
            endWeek != null && endWeek != startWeek ? { week: endWeek } : null
        this._type = 'week'
        return this
    }

    /**
     * @return a month-based interval
     */
    month(startMonth, endMonth) {
        if (startMonth == null) {
            throw Error("Start month can't be null")
        }
        this._start = { month: startMonth }
        this._end =
            endMonth != null && endMonth != startMonth
                ? { month: endMonth }
                : null
        this._type = 'month'
        return this
    }

    /**
     * @return a holiday-based interval
     */
    holiday(holiday) {
        if (
            holiday == null ||
            (holiday != 'PH' && holiday != 'SH' && holiday != 'easter')
        ) {
            throw Error('Invalid holiday, must be PH, SH or easter')
        }
        this._start = { holiday: holiday }
        this._end = null
        this._type = 'holiday'
        return this
    }

    /**
     * @return a holiday-based interval
     */
    always() {
        this._start = null
        this._end = null
        this._type = 'always'
        return this
    }

    //ACCESSORS
    /**
     * @return The kind of wide interval (always, day, month, week, holiday)
     */
    getType() {
        return this._type
    }

    /**
     * @return The start moment
     */
    getStart() {
        return this._start
    }

    /**
     * @return The end moment
     */
    getEnd() {
        return this._end
    }

    /**
     * @return True if the given object concerns the same interval as this one
     */
    equals(o) {
        if (!o instanceof WideInterval) {
            return false
        }
        if (this === o) {
            return true
        }
        if (o._type == 'always') {
            return this._type == 'always'
        }
        let result = false

        switch (this._type) {
            case 'always':
                result = o._start == null
                break
            case 'day':
                result =
                    (o._type == 'day' &&
                        o._start.month == this._start.month &&
                        o._start.day == this._start.day &&
                        ((o._end == null && this._end == null) ||
                            (o._end != null &&
                                this._end != null &&
                                this._end.month == o._end.month &&
                                this._end.day == o._end.day))) ||
                    (o._type == 'month' &&
                        o._start.month == this._start.month &&
                        this.isFullMonth() &&
                        o.isFullMonth()) ||
                    (o._end != null &&
                        this._end != null &&
                        this._end.month == o._end.month &&
                        this.endsMonth() &&
                        o.endsMonth())
                break

            case 'week':
                result =
                    o._start.week == this._start.week &&
                    (o._end == this._end ||
                        (this._end != null &&
                            o._end != null &&
                            o._end.week == this._end.week))
                break

            case 'month':
                result =
                    (o._type == 'day' &&
                        this._start.month == o._start.month &&
                        o.startsMonth() &&
                        ((this._end == null &&
                            o._end != null &&
                            this._start.month == o._end.month &&
                            o.endsMonth()) ||
                            (this._end != null &&
                                o._end != null &&
                                this._end.month == o._end.month &&
                                o.endsMonth()))) ||
                    (o._type == 'month' &&
                        o._start.month == this._start.month &&
                        ((this._end == null && o._end == null) ||
                            (this._end != null &&
                                o._end != null &&
                                this._end.month == o._end.month)))
                break

            case 'holiday':
                result = o._start.holiday == this._start.holiday
                break
            default:
        }

        return result
    }

    /**
     * @return The human readable time
     */
    getTimeForHumans() {
        let result

        switch (this._type) {
            case 'day':
                if (this._end != null) {
                    result =
                        'every week from ' +
                        Constants.IRL_MONTHS[this._start.month - 1] +
                        ' ' +
                        this._start.day +
                        ' to '
                    if (this._start.month != this._end.month) {
                        result +=
                            Constants.IRL_MONTHS[this._end.month - 1] + ' '
                    }
                    result += this._end.day
                } else {
                    result =
                        'day ' +
                        Constants.IRL_MONTHS[this._start.month - 1] +
                        ' ' +
                        this._start.day
                }
                break

            case 'week':
                if (this._end != null) {
                    result =
                        'every week from week ' +
                        this._start.week +
                        ' to ' +
                        this._end.week
                } else {
                    result = 'week ' + this._start.week
                }
                break

            case 'month':
                if (this._end != null) {
                    result =
                        'every week from ' +
                        Constants.IRL_MONTHS[this._start.month - 1] +
                        ' to ' +
                        Constants.IRL_MONTHS[this._end.month - 1]
                } else {
                    result =
                        'every week in ' +
                        Constants.IRL_MONTHS[this._start.month - 1]
                }
                break

            case 'holiday':
                if (this._start.holiday == 'SH') {
                    result = 'every week during school holidays'
                } else if (this._start.holiday == 'PH') {
                    result = 'every public holidays'
                } else if (this._start.holiday == 'easter') {
                    result = 'each easter day'
                } else {
                    throw new Error(
                        'Invalid holiday type: ' + this._start.holiday
                    )
                }
                break

            case 'always':
                result = 'every week of year'
                break
            default:
                result = 'invalid time'
        }

        return result
    }

    /**
     * @return The time selector for OSM opening_hours
     */
    getTimeSelector() {
        let result

        switch (this._type) {
            case 'day':
                result =
                    Constants.OSM_MONTHS[this._start.month - 1] +
                    ' ' +
                    (this._start.day < 10 ? '0' : '') +
                    this._start.day
                if (this._end != null) {
                    //Same month as start ?
                    if (this._start.month == this._end.month) {
                        result +=
                            '-' +
                            (this._end.day < 10 ? '0' : '') +
                            this._end.day
                    } else {
                        result +=
                            '-' +
                            Constants.OSM_MONTHS[this._end.month - 1] +
                            ' ' +
                            (this._end.day < 10 ? '0' : '') +
                            this._end.day
                    }
                }
                break

            case 'week':
                result =
                    'week ' +
                    (this._start.week < 10 ? '0' : '') +
                    this._start.week
                if (this._end != null) {
                    result +=
                        '-' + (this._end.week < 10 ? '0' : '') + this._end.week
                }
                break

            case 'month':
                result = Constants.OSM_MONTHS[this._start.month - 1]
                if (this._end != null) {
                    result += '-' + Constants.OSM_MONTHS[this._end.month - 1]
                }
                break

            case 'holiday':
                result = this._start.holiday
                break

            case 'always':
            default:
                result = ''
        }

        return result
    }

    /**
     * Does this interval corresponds to a full month ?
     */
    isFullMonth() {
        if (this._type == 'month' && this._end == null) {
            return true
        } else if (this._type == 'day') {
            return (
                this._start.day == 1 &&
                this._end != null &&
                this._end.month == this._start.month &&
                this._end.day != undefined &&
                this._end.day == Constants.MONTH_END_DAY[this._end.month - 1]
            )
        } else {
            return false
        }
    }

    /**
     * Does this interval starts the first day of a month
     */
    startsMonth() {
        return (
            this._type == 'month' ||
            this._type == 'always' ||
            (this._type == 'day' && this._start.day == 1)
        )
    }

    /**
     * Does this interval ends the last day of a month
     */
    endsMonth() {
        return (
            this._type == 'month' ||
            this._type == 'always' ||
            (this._type == 'day' &&
                this._end != null &&
                this._end.day == Constants.MONTH_END_DAY[this._end.month - 1])
        )
    }

    /**
     * Does this interval strictly contains the given one (ie the second is a refinement of the first, and not strictly equal)
     * @param o The other wide interval
     * @return True if this date contains the given one (and is not strictly equal to)
     */
    contains(o) {
        let result = false

        /*
         * Check if it is contained in this one
         */
        if (this.equals(o)) {
            result = false
        } else if (this._type == 'always') {
            result = true
        } else if (this._type == 'day') {
            if (o._type == 'day') {
                //Starting after
                if (
                    o._start.month > this._start.month ||
                    (o._start.month == this._start.month &&
                        o._start.day >= this._start.day)
                ) {
                    //Ending before
                    if (o._end != null) {
                        if (
                            this._end != null &&
                            (o._end.month < this._end.month ||
                                (o._end.month == this._end.month &&
                                    o._end.day <= this._end.day))
                        ) {
                            result = true
                        }
                    } else {
                        if (
                            this._end != null &&
                            (o._start.month < this._end.month ||
                                (o._start.month == this._end.month &&
                                    o._start.day <= this._end.day))
                        ) {
                            result = true
                        }
                    }
                }
            } else if (o._type == 'month') {
                //Starting after
                if (
                    o._start.month > this._start.month ||
                    (o._start.month == this._start.month &&
                        this._start.day == 1)
                ) {
                    //Ending before
                    if (
                        o._end != null &&
                        this._end != null &&
                        (o._end.month < this._end.month ||
                            (o._end.month == this._end.month &&
                                this._end.day ==
                                    Constants.MONTH_END_DAY[end.month - 1]))
                    ) {
                        result = true
                    } else if (
                        o._end == null &&
                        this._end != null &&
                        o._start.month < this._end.month
                    ) {
                        result = true
                    }
                }
            }
        } else if (this._type == 'week') {
            if (o._type == 'week') {
                if (o._start.week >= this._start.week) {
                    if (
                        o._end != null &&
                        this._end != null &&
                        o._end.week <= this._end.week
                    ) {
                        result = true
                    } else if (
                        o._end == null &&
                        ((this._end != null &&
                            o._start.week <= this._end.week) ||
                            o._start.week == this._start.week)
                    ) {
                        result = true
                    }
                }
            }
        } else if (this._type == 'month') {
            if (o._type == 'month') {
                if (o._start.month >= this._start.month) {
                    if (
                        o._end != null &&
                        this._end != null &&
                        o._end.month <= this._end.month
                    ) {
                        result = true
                    } else if (
                        o._end == null &&
                        ((this._end != null &&
                            o._start.month <= this._end.month) ||
                            o._start.month == this._start.month)
                    ) {
                        result = true
                    }
                }
            } else if (o._type == 'day') {
                if (o._end != null) {
                    if (this._end == null) {
                        if (
                            o._start.month == this._start.month &&
                            o._end.month == this._start.month &&
                            ((o._start.day >= 1 &&
                                o._end.day <
                                    Constants.MONTH_END_DAY[
                                        o._start.month - 1
                                    ]) ||
                                (o._start.day > 1 &&
                                    o._end.day <=
                                        Constants.MONTH_END_DAY[
                                            o._start.month - 1
                                        ]))
                        ) {
                            result = true
                        }
                    } else {
                        if (
                            o._start.month >= this._start.month &&
                            o._end.month <= this._end.month
                        ) {
                            if (
                                (o._start.month > this._start.month &&
                                    o._end.month < this._end.month) ||
                                (o._start.month == this._start.month &&
                                    o._end.month < this._end.month &&
                                    o._start.day > 1) ||
                                (o._start.month > this._start.month &&
                                    o._end.month == this._end.month &&
                                    o._end.day <
                                        Constants.MONTH_END_DAY[
                                            o._end.month - 1
                                        ]) ||
                                (o._start.day >= 1 &&
                                    o._end.day <
                                        Constants.MONTH_END_DAY[
                                            o._end.month - 1
                                        ]) ||
                                (o._start.day > 1 &&
                                    o._end.day <=
                                        Constants.MONTH_END_DAY[
                                            o._end.month - 1
                                        ])
                            ) {
                                result = true
                            }
                        }
                    }
                } else {
                    if (this._end == null) {
                        if (this._start.month == o._start.month) {
                            result = true
                        }
                    } else {
                        if (
                            o._start.month >= this._start.month &&
                            o._start.month <= this._end.month
                        ) {
                            result = true
                        }
                    }
                }
            }
        }

        return result
    }
}

module.exports = WideInterval
