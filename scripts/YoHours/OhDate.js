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
require('./Compatibility')
let Constants = require('./Constants')

/**
 * An opening_hours date, such as "Apr 21", "week 1-15 Mo,Tu", "Apr-Dec Mo-Fr", "SH Su", ...
 */
class OhDate {
    //CONSTRUCTOR
    /**
     * Constructor
     * @param w The wide selector, as string
     * @param wt The wide selector type (month, week, day, holiday, always)
     * @param wd The weekdays, as integer array (0 to 6 = Monday to Sunday, -1 = single day date, -2 = PH)
     */
    constructor(w, wt, wd) {
        /** Kind of wide date (month, week, day, holiday, always) **/
        this._wideType = wt

        /** Wide date **/
        this._wide = w

        /** Weekdays + PH **/
        this._weekdays = wd.sort()

        /** Overwritten days (to allow create simpler rules) **/
        this._wdOver = []

        if (w == null || wt == null || wd == null) {
            throw Error('Missing parameter')
        }
    }

    //ACCESSORS
    /**
     * @return The wide type
     */
    getWideType() {
        return this._wideType
    }

    /**
     * @return The monthday, month, week, SH (depends of type)
     */
    getWideValue() {
        return this._wide
    }

    /**
     * @return The weekdays array
     */
    getWd() {
        return this._weekdays
    }

    /**
     * @return The overwrittent weekdays array
     */
    getWdOver() {
        return this._wdOver
    }

    /**
     * @param a The other weekdays array
     * @return True if same weekdays as other object
     */
    sameWd(a) {
        return a.equals(this._weekdays)
    }

    /**
     * @return The weekdays in opening_hours syntax
     */
    getWeekdays() {
        let result = ''
        let wd = this._weekdays.concat(this._wdOver).sort()

        //PH as weekday
        if (wd.length > 0 && wd[0] == Constants.PH_WEEKDAY) {
            result = 'PH'
            wd.shift()
        }

        //Check if we should create a continuous interval for week-end
        if (
            wd.length > 0 &&
            wd.contains(6) &&
            wd.contains(0) &&
            (wd.contains(5) || wd.contains(1))
        ) {
            //Find when the week-end starts
            let startWE = 6
            let i = wd.length - 2,
                stopLooking = false
            while (!stopLooking && i >= 0) {
                if (wd[i] == wd[i + 1] - 1) {
                    startWE = wd[i]
                    i--
                } else {
                    stopLooking = true
                }
            }

            //Find when it stops
            i = 1
            stopLooking = false
            let endWE = 0

            while (!stopLooking && i < wd.length) {
                if (wd[i - 1] == wd[i] - 1) {
                    endWE = wd[i]
                    i++
                } else {
                    stopLooking = true
                }
            }

            //If long enough, add it as first weekday interval
            let length = 7 - startWE + endWE + 1

            if (length >= 3 && startWE > endWE) {
                if (result.length > 0) {
                    result += ','
                }
                result +=
                    Constants.OSM_DAYS[startWE] +
                    '-' +
                    Constants.OSM_DAYS[endWE]

                //Remove processed days
                let j = 0
                while (j < wd.length) {
                    if (wd[j] <= endWE || wd[j] >= startWE) {
                        wd.splice(j, 1)
                    } else {
                        j++
                    }
                }
            }
        }

        //Process only if not empty weekday list
        if (wd.length > 1 || (wd.length == 1 && wd[0] != -1)) {
            result +=
                result.length > 0
                    ? ',' + Constants.OSM_DAYS[wd[0]]
                    : Constants.OSM_DAYS[wd[0]]
            let firstInRow = wd[0]

            for (let i = 1; i < wd.length; i++) {
                //When days aren't following
                if (wd[i - 1] != wd[i] - 1) {
                    //Previous day range length > 1
                    if (firstInRow != wd[i - 1]) {
                        //Two days
                        if (wd[i - 1] - firstInRow == 1) {
                            result += ',' + Constants.OSM_DAYS[wd[i - 1]]
                        } else {
                            result += '-' + Constants.OSM_DAYS[wd[i - 1]]
                        }
                    }

                    //Add the current day
                    result += ',' + Constants.OSM_DAYS[wd[i]]
                    firstInRow = wd[i]
                } else if (i == wd.length - 1) {
                    if (wd[i] - firstInRow == 1) {
                        result += ',' + Constants.OSM_DAYS[wd[i]]
                    } else {
                        result += '-' + Constants.OSM_DAYS[wd[i]]
                    }
                }
            }
        }

        if (result == 'Mo-Su') {
            result = ''
        }

        return result
    }

    /**
     * Is the given object of the same kind as this one
     * @return True if same weekdays and same wide type
     */
    sameKindAs(d) {
        return this._wideType == d.getWideType() && d.sameWd(this._weekdays)
    }

    /**
     * @return True if this object is equal to the given one
     */
    equals(o) {
        return (
            o instanceof OhDate &&
            this._wideType == o.getWideType() &&
            this._wide == o.getWideValue() &&
            o.sameWd(this._weekdays)
        )
    }

    //MODIFIERS
    /**
     * Adds a new weekday in this date
     */
    addWeekday(wd) {
        if (!this._weekdays.contains(wd) && !this._wdOver.contains(wd)) {
            this._weekdays.push(wd)
            this._weekdays = this._weekdays.sort()
        }
    }

    /**
     * Adds public holiday as a weekday of this date
     */
    addPhWeekday() {
        this.addWeekday(Constants.PH_WEEKDAY)
    }

    /**
     * Adds an overwritten weekday, which can be included in this date and that will be overwritten in a following rule
     */
    addOverwrittenWeekday(wd) {
        if (!this._wdOver.contains(wd) && !this._weekdays.contains(wd)) {
            this._wdOver.push(wd)
            this._wdOver = this._wdOver.sort()
        }
    }
}

module.exports = OhDate
