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
let OpeningHoursParser = require("./OpeningHoursParser");


/**
 * Check compatibility of opening_hours string with YoHours
 */
class YoHoursChecker {
//CONSTRUCTOR
	constructor() {
		/** The OpeningHoursParser **/
		this._parser = new OpeningHoursParser();
	}

//OTHER METHODS
	/**
	 * Check if the opening_hours is readable by YoHours
	 * @param oh The opening_hours string
	 * @return True if YoHours can read it and display it
	 */
	canRead(oh) {
		var result = false;
		
		try {
			var parsed = this._parser.parse(oh);
			if(parsed != null) {
				result = true;
			}
		}
		catch(e) {;}
		
		return result;
	}
}

module.exports = YoHoursChecker;
