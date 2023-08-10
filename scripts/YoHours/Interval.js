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
 * Class Interval, defines an interval in a week where the POI is open.
 */
class Interval {
    //CONSTRUCTOR
    /**
     * Class constructor
     * @param dayStart The start week day (use DAYS constants)
     * @param dayEnd The end week day (use DAYS constants)
     * @param minStart The interval start (in minutes since midnight)
     * @param minEnd The interval end (in minutes since midnight)
     */
    constructor(dayStart, dayEnd, minStart, minEnd) {
        /** The start day in the week, see DAYS **/
        this._dayStart = dayStart

        /** The end day in the week, see DAYS **/
        this._dayEnd = dayEnd

        /** The interval start, in minutes since midnight (local hour) **/
        this._start = minStart

        /** The interval end, in minutes since midnight (local hour) **/
        this._end = minEnd

        if (this._dayEnd == 0 && this._end == 0) {
            this._dayEnd = Constants.DAYS_MAX
            this._end = Constants.MINUTES_MAX
        }
        //console.log("Interval", this._dayStart, this._dayEnd, this._start, this._end);
    }

    //ACCESSORS
    /**
     * @return The start day in the week, see DAYS constants
     */
    getStartDay() {
        return this._dayStart
    }

    /**
     * @return The end day in the week, see DAYS constants
     */
    getEndDay() {
        return this._dayEnd
    }

    /**
     * @return The interval start, in minutes since midnight
     */
    getFrom() {
        return this._start
    }

    /**
     * @return The interval end, in minutes since midnight
     */
    getTo() {
        return this._end
    }

    //OTHER METHODS
    clone() {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this)
    }
}

module.exports = Interval
