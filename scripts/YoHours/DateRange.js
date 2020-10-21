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
let Day = require("./Day");
let Week = require("./Week");
let WideInterval = require("./WideInterval");


/**
 * Class DateRange, defines a range of months, weeks or days.
 * A typical week or day will be associated.
 */
class DateRange {
//CONSTRUCTOR
	constructor(w) {
		/** The wide interval of this date range **/
		this._wideInterval = null;
		
		/** The typical week or day associated **/
		this._typical = undefined;
		
		this.updateRange(w);
	}

//ACCESSORS
	/**
	 * Is this interval defining a typical day ?
	 */
	definesTypicalDay() {
		return this._typical instanceof Day;
	}
	
	/**
	 * Is this interval defining a typical week ?
	 */
	definesTypicalWeek() {
		return this._typical instanceof Week;
	}
	
	/**
	 * @return The typical day or week
	 */
	getTypical() {
		return this._typical;
	}
	
	/**
	 * @return The wide interval this date range concerns
	 */
	getInterval() {
		return this._wideInterval;
	}

//MODIFIERS
	/**
	 * Changes the date range
	 */
	updateRange(wide) {
		this._wideInterval = (wide != null) ? wide : new WideInterval().always();

		//Create typical week/day
		if(this._typical == undefined) {
			switch(this._wideInterval.getType()) {
				case "day":
					if(this._wideInterval.getEnd() == null) {
						this._typical = new Day();
					}
					else {
						this._typical = new Week();
					}
					break;
				case "week":
					this._typical = new Week();
					break;
				case "month":
					this._typical = new Week();
					break;
				case "holiday":
					if(this._wideInterval.getStart().holiday == "SH") {
						this._typical = new Week();
					}
					else {
						this._typical = new Day();
					}
					break;
				case "always":
					this._typical = new Week();
					break;
				default:
					throw Error("Invalid interval type: "+this._wideInterval.getType());
			}
		}
	}

//OTHER METHODS
	/**
	 * Check if the typical day/week of this date range is the same as in the given date range
	 * @param dr The other DateRange
	 * @return True if same typical day/week
	 */
	hasSameTypical(dr) {
		return this.definesTypicalDay() == dr.definesTypicalDay() && this._typical.sameAs(dr.getTypical());
	}
	
	/**
	 * Does this date range contains the given date range (ie the second is a refinement of the first)
	 * @param start The start of the date range
	 * @param end The end of the date range
	 * @return True if this date contains the given one (and is not strictly equal to)
	 */
	isGeneralFor(dr) {
		return dr.definesTypicalDay() == this.definesTypicalDay() && this._wideInterval.contains(dr.getInterval());
	}
}

module.exports = DateRange;
