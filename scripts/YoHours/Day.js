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
 * Class Day, represents a typical day
 */
class Day {
    //CONSTRUCTOR
    constructor() {
        /** The intervals defining this week **/
        this._intervals = []

        /** The next interval ID **/
        this._nextInterval = 0
    }

    //ACCESSORS
    /**
     * @return This day, as a boolean array (minutes since midnight). True if open, false else.
     */
    getAsMinutesArray() {
        //Create array with all values set to false
        //For each minute
        let minuteArray = []
        for (let minute = 0; minute <= Constants.MINUTES_MAX; minute++) {
            minuteArray[minute] = false
        }

        //Set to true values where an interval is defined
        for (let id = 0, l = this._intervals.length; id < l; id++) {
            if (this._intervals[id] != undefined) {
                let startMinute = null
                let endMinute = null

                if (
                    this._intervals[id].getStartDay() ==
                        this._intervals[id].getEndDay() ||
                    (this._intervals[id].getEndDay() == Constants.DAYS_MAX &&
                        this._intervals[id].getTo() == Constants.MINUTES_MAX)
                ) {
                    //Define start and end minute regarding the current day
                    startMinute = this._intervals[id].getFrom()
                    endMinute = this._intervals[id].getTo()
                }

                //Set to true the minutes for this day
                if (startMinute != null && endMinute != null) {
                    for (
                        let minute = startMinute;
                        minute <= endMinute;
                        minute++
                    ) {
                        minuteArray[minute] = true
                    }
                } else {
                    console.log(
                        this._intervals[id].getFrom() +
                            ' ' +
                            this._intervals[id].getTo() +
                            ' ' +
                            this._intervals[id].getStartDay() +
                            ' ' +
                            this._intervals[id].getEndDay()
                    )
                    throw new Error('Invalid interval')
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
            let minStart = -1,
                minEnd

            for (let min = 0, lm = minuteArray.length; min < lm; min++) {
                //First minute
                if (min == 0) {
                    if (minuteArray[min]) {
                        minStart = min
                    }
                }
                //Last minute
                else if (min == lm - 1) {
                    if (minuteArray[min]) {
                        intervals.push(new Interval(0, 0, minStart, min))
                    }
                }
                //Other minutes
                else {
                    //New interval
                    if (minuteArray[min] && minStart < 0) {
                        minStart = min
                    }
                    //Ending interval
                    else if (!minuteArray[min] && minStart >= 0) {
                        intervals.push(new Interval(0, 0, minStart, min - 1))

                        minStart = -1
                    }
                }
            }

            return intervals
        } else {
            return this._intervals
        }
    }

    //MODIFIERS
    /**
     * Add a new interval to this week
     * @param interval The new interval
     * @return The ID of the added interval
     */
    addInterval(interval) {
        this._intervals[this._nextInterval] = interval
        this._nextInterval++

        return this._nextInterval - 1
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
     * Redefines this date range intervals with a copy of the given ones
     */
    copyIntervals(intervals) {
        this._intervals = []
        for (let i = 0; i < intervals.length; i++) {
            if (
                intervals[i] != undefined &&
                intervals[i].getStartDay() == 0 &&
                intervals[i].getEndDay() == 0
            ) {
                this._intervals.push(intervals[i].clone())
            }
        }

        this._intervals = this.getIntervals(true)
    }

    /**
     * Removes all defined intervals
     */
    clearIntervals() {
        this._intervals = []
    }

    //OTHER METHODS
    /**
     * Is this day defining the same intervals as the given one ?
     */
    sameAs(d) {
        return d.getAsMinutesArray().equals(this.getAsMinutesArray())
    }
}

module.exports = Day
