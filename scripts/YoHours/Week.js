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
let Interval = require('./Interval')
let Constants = require('./Constants')

/**
 * Class Week, represents a typical week of opening hours.
 */
class Week {
    //CONSTRUCTOR
    constructor() {
        /** The intervals defining this week **/
        this._intervals = []
    }

    //ACCESSORS
    /**
     * @return This week, as a two-dimensional boolean array. First dimension is for days (see DAYS), second dimension for minutes since midnight. True if open, false else.
     */
    getAsMinutesArray() {
        //Create array with all values set to false
        //For each day
        let minuteArray = []
        for (let day = 0; day <= Constants.DAYS_MAX; day++) {
            //For each minute
            minuteArray[day] = []
            for (let minute = 0; minute <= Constants.MINUTES_MAX; minute++) {
                minuteArray[day][minute] = false
            }
        }

        //Set to true values where an interval is defined
        for (let id = 0, l = this._intervals.length; id < l; id++) {
            if (this._intervals[id] != undefined) {
                for (
                    let day = this._intervals[id].getStartDay();
                    day <= this._intervals[id].getEndDay();
                    day++
                ) {
                    //Define start and end minute regarding the current day
                    let startMinute =
                        day == this._intervals[id].getStartDay()
                            ? this._intervals[id].getFrom()
                            : 0
                    let endMinute =
                        day == this._intervals[id].getEndDay()
                            ? this._intervals[id].getTo()
                            : Constants.MINUTES_MAX

                    //Set to true the minutes for this day
                    if (startMinute != null && endMinute != null) {
                        for (
                            let minute = startMinute;
                            minute <= endMinute;
                            minute++
                        ) {
                            minuteArray[day][minute] = true
                        }
                    }
                }
            }
        }

        return minuteArray
    }

    /**
     * @param clean Clean intervals ? (default: false)
     * @return The intervals in this week
     */
    getIntervals(clean) {
        clean = clean || false

        if (clean) {
            //Create continuous intervals over days
            let minuteArray = this.getAsMinutesArray()
            let intervals = []
            let dayStart = -1,
                minStart = -1,
                minEnd

            for (let day = 0, l = minuteArray.length; day < l; day++) {
                for (
                    let min = 0, lm = minuteArray[day].length;
                    min < lm;
                    min++
                ) {
                    //First minute of monday
                    if (day == 0 && min == 0) {
                        if (minuteArray[day][min]) {
                            dayStart = day
                            minStart = min
                        }
                    }
                    //Last minute of sunday
                    else if (day == Constants.DAYS_MAX && min == lm - 1) {
                        if (dayStart >= 0 && minuteArray[day][min]) {
                            intervals.push(
                                new Interval(dayStart, day, minStart, min)
                            )
                        }
                    }
                    //Other days or minutes
                    else {
                        //New interval
                        if (minuteArray[day][min] && dayStart < 0) {
                            dayStart = day
                            minStart = min
                        }
                        //Ending interval
                        else if (!minuteArray[day][min] && dayStart >= 0) {
                            if (min == 0) {
                                intervals.push(
                                    new Interval(
                                        dayStart,
                                        day - 1,
                                        minStart,
                                        Constants.MINUTES_MAX
                                    )
                                )
                            } else {
                                intervals.push(
                                    new Interval(
                                        dayStart,
                                        day,
                                        minStart,
                                        min - 1
                                    )
                                )
                            }
                            dayStart = -1
                            minStart = -1
                        }
                    }
                }
            }

            return intervals
        } else {
            return this._intervals
        }
    }

    /**
     * Returns the intervals which are different from those defined in the given week
     * @param w The general week
     * @return The intervals which are different, as object { open: [ Intervals ], closed: [ Intervals ] }
     */
    getIntervalsDiff(w) {
        //Get minutes arrays
        let myMinArray = this.getAsMinutesArray()
        let wMinArray = w.getAsMinutesArray()

        //Create diff array
        let intervals = { open: [], closed: [] }
        let dayStart = -1,
            minStart = -1,
            minEnd
        let diffDay, m, intervalsLength

        for (let d = 0; d <= Constants.DAYS_MAX; d++) {
            diffDay = false
            m = 0
            intervalsLength = intervals.open.length

            while (m <= Constants.MINUTES_MAX) {
                //Copy entire day
                if (diffDay) {
                    //First minute of monday
                    if (d == 0 && m == 0) {
                        if (myMinArray[d][m]) {
                            dayStart = d
                            minStart = m
                        }
                    }
                    //Last minute of sunday
                    else if (
                        d == Constants.DAYS_MAX &&
                        m == Constants.MINUTES_MAX
                    ) {
                        if (dayStart >= 0 && myMinArray[d][m]) {
                            intervals.open.push(
                                new Interval(dayStart, d, minStart, m)
                            )
                        }
                    }
                    //Other days or minutes
                    else {
                        //New interval
                        if (myMinArray[d][m] && dayStart < 0) {
                            dayStart = d
                            minStart = m
                        }
                        //Ending interval
                        else if (!myMinArray[d][m] && dayStart >= 0) {
                            if (m == 0) {
                                intervals.open.push(
                                    new Interval(
                                        dayStart,
                                        d - 1,
                                        minStart,
                                        Constants.MINUTES_MAX
                                    )
                                )
                            } else {
                                intervals.open.push(
                                    new Interval(dayStart, d, minStart, m - 1)
                                )
                            }
                            dayStart = -1
                            minStart = -1
                        }
                    }
                    m++
                }
                //Check for diff
                else {
                    diffDay = myMinArray[d][m]
                        ? !wMinArray[d][m]
                        : wMinArray[d][m]

                    //If there is a difference, start to copy full day
                    if (diffDay) {
                        m = 0
                    }
                    //Else, continue checking
                    else {
                        m++
                    }
                }
            }

            //Close intervals if day is identical
            if (!diffDay && dayStart > -1) {
                intervals.open.push(
                    new Interval(
                        dayStart,
                        d - 1,
                        minStart,
                        Constants.MINUTES_MAX
                    )
                )
                dayStart = -1
                minStart = -1
            }

            //Create closed intervals if closed all day
            if (
                diffDay &&
                dayStart == -1 &&
                intervalsLength == intervals.open.length
            ) {
                //Merge with previous interval if possible
                if (
                    intervals.closed.length > 0 &&
                    intervals.closed[intervals.closed.length - 1].getEndDay() ==
                        d - 1
                ) {
                    intervals.closed[intervals.closed.length - 1] =
                        new Interval(
                            intervals.closed[
                                intervals.closed.length - 1
                            ].getStartDay(),
                            d,
                            0,
                            Constants.MINUTES_MAX
                        )
                } else {
                    intervals.closed.push(
                        new Interval(d, d, 0, Constants.MINUTES_MAX)
                    )
                }
            }
        }

        return intervals
    }

    //MODIFIERS
    /**
     * Add a new interval to this week
     * @param interval The new interval
     * @return The ID of the added interval
     */
    addInterval(interval) {
        this._intervals[this._intervals.length] = interval
        return this._intervals.length - 1
    }

    /**
     * Edits the given interval
     * @param id The interval ID
     * @param interval The new interval
     */
    editInterval(id, interval) {
        this._intervals[id] = interval
    }

    /**
     * Remove the given interval
     * @param id the interval ID
     */
    removeInterval(id) {
        this._intervals[id] = undefined
    }

    /**
     * Removes all intervals during a given day
     */
    removeIntervalsDuringDay(day) {
        let interval,
            itLength = this._intervals.length,
            dayDiff
        for (let i = 0; i < itLength; i++) {
            interval = this._intervals[i]
            if (interval != undefined) {
                //If interval over given day
                if (
                    interval.getStartDay() <= day &&
                    interval.getEndDay() >= day
                ) {
                    dayDiff = interval.getEndDay() - interval.getStartDay()

                    //Avoid deletion if over night interval
                    if (
                        dayDiff > 1 ||
                        dayDiff == 0 ||
                        interval.getStartDay() == day ||
                        interval.getFrom() <= interval.getTo()
                    ) {
                        //Create new interval if several day
                        if (
                            interval.getEndDay() - interval.getStartDay() >=
                                1 &&
                            interval.getFrom() <= interval.getTo()
                        ) {
                            if (interval.getStartDay() < day) {
                                this.addInterval(
                                    new Interval(
                                        interval.getStartDay(),
                                        day - 1,
                                        interval.getFrom(),
                                        24 * 60
                                    )
                                )
                            }
                            if (interval.getEndDay() > day) {
                                this.addInterval(
                                    new Interval(
                                        day + 1,
                                        interval.getEndDay(),
                                        0,
                                        interval.getTo()
                                    )
                                )
                            }
                        }

                        //Delete
                        this.removeInterval(i)
                    }
                }
            }
        }
    }

    /**
     * Redefines this date range intervals with a copy of the given ones
     */
    copyIntervals(intervals) {
        this._intervals = []
        for (let i = 0; i < intervals.length; i++) {
            if (intervals[i] != undefined) {
                this._intervals.push(intervals[i].clone())
            }
        }
    }

    //OTHER METHODS
    /**
     * Is this week defining the same intervals as the given one ?
     */
    sameAs(w) {
        return w.getAsMinutesArray().equals(this.getAsMinutesArray())
    }
}

module.exports = Week
