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
let OhDate = require('./OhDate')
let OhTime = require('./OhTime')

/**
 * An opening_hours rule, such as "Mo,Tu 08:00-18:00"
 */
class OhRule {
    //CONSTRUCTOR
    constructor() {
        /** The date selectors **/
        this._date = []

        /** The time selectors **/
        this._time = []
    }

    //ACCESSORS
    /**
     * @return The date selectors, as an array
     */
    getDate() {
        return this._date
    }

    /**
     * @return The time selectors, as an array
     */
    getTime() {
        return this._time
    }

    /**
     * @return The opening_hours value
     */
    get() {
        let result = ''

        //Create date part
        if (this._date.length > 1 || this._date[0].getWideValue() != '') {
            //Add wide selectors
            for (let i = 0, l = this._date.length; i < l; i++) {
                if (i > 0) {
                    result += ','
                }
                result += this._date[i].getWideValue()
            }
        }

        //Add weekdays
        if (this._date.length > 0) {
            let wd = this._date[0].getWeekdays()
            if (wd.length > 0) {
                result += ' ' + wd
            }
        }

        //Create time part
        if (this._time.length > 0) {
            result += ' '
            for (let i = 0, l = this._time.length; i < l; i++) {
                if (i > 0) {
                    result += ','
                }
                result += this._time[i].get()
            }
        } else {
            result += ' off'
        }

        if (result.trim() == '00:00-24:00') {
            result = '24/7'
        }

        return result.trim()
    }

    /**
     * @return True if the given rule has the same time as this one
     */
    sameTime(o) {
        if (
            o == undefined ||
            o == null ||
            o.getTime().length != this._time.length
        ) {
            return false
        } else {
            for (let i = 0, l = this._time.length; i < l; i++) {
                if (!this._time[i].equals(o.getTime()[i])) {
                    return false
                }
            }
            return true
        }
    }

    /**
     * Is this rule concerning off time ?
     */
    isOff() {
        return (
            this._time.length == 0 ||
            (this._time.length == 1 && this._time[0].getStart() == null)
        )
    }

    /**
     * Does the rule have any overwritten weekday ?
     */
    hasOverwrittenWeekday() {
        return this._date.length > 0 && this._date[0]._wdOver.length > 0
    }

    //MODIFIERS
    /**
     * Adds a weekday to all the dates
     */
    addWeekday(wd) {
        for (let i = 0; i < this._date.length; i++) {
            this._date[i].addWeekday(wd)
        }
    }

    /**
     * Adds public holidays as weekday to all dates
     */
    addPhWeekday() {
        for (let i = 0; i < this._date.length; i++) {
            this._date[i].addPhWeekday()
        }
    }

    /**
     * Adds an overwritten weekday to all the dates
     */
    addOverwrittenWeekday(wd) {
        for (let i = 0; i < this._date.length; i++) {
            this._date[i].addOverwrittenWeekday(wd)
        }
    }

    /**
     * @param d A new date selector
     */
    addDate(d) {
        //Check param
        if (d == null || d == undefined || !d instanceof OhDate) {
            throw Error('Invalid parameter')
        }

        //Check if date can be added
        if (
            this._date.length == 0 ||
            (this._date[0].getWideType() != 'always' &&
                this._date[0].sameKindAs(d))
        ) {
            this._date.push(d)
        } else {
            if (
                this._date.length != 1 ||
                this._date[0].getWideType() != 'always' ||
                !this._date[0].sameWd(d.getWd())
            ) {
                throw Error("This date can't be added to this rule")
            }
        }
    }

    /**
     * @param t A new time selector
     */
    addTime(t) {
        if (
            (this._time.length == 0 || this._time[0].get() != 'off') &&
            !this._time.contains(t)
        ) {
            this._time.push(t)
        } else {
            throw Error("This time can't be added to this rule")
        }
    }
}

module.exports = OhRule
