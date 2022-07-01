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

/**
 * An opening_hours time, such as "08:00" or "08:00-10:00" or "off" (if no start and end)
 * @param start The start minute (from midnight), can be null
 * @param end The end minute (from midnight), can be null
 */
class OhTime {
    //CONSTRUCTOR
    /**
     * @param start The start minute (from midnight), can be null
     * @param end The end minute (from midnight), can be null
     */
    constructor(start, end) {
        /** The start minute **/
        this._start = start >= 0 ? start : null

        /** The end minute **/
        this._end = end >= 0 && end != start ? end : null
    }

    //ACCESSORS
    /**
     * @return The time in opening_hours format
     */
    get() {
        if (this._start === null && this._end === null) {
            return 'off'
        } else {
            return (
                this._timeString(this._start) +
                (this._end == null ? '' : '-' + this._timeString(this._end))
            )
        }
    }

    /**
     * @return The start minutes
     */
    getStart() {
        return this._start
    }

    /**
     * @return The end minutes
     */
    getEnd() {
        return this._end
    }

    /**
     * @return True if same time
     */
    equals(t) {
        return this._start == t.getStart() && this._end == t.getEnd()
    }

    //OTHER METHODS
    /**
     * @return The hour in HH:MM format
     */
    _timeString(minutes) {
        var h = Math.floor(minutes / 60)
        var period = ''
        var m = minutes % 60
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + period
    }
}

module.exports = OhTime
