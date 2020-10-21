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

let Constants = {
	/**
	 * The days in a week
	 */
	DAYS: {
		MONDAY: 0,
		TUESDAY: 1,
		WEDNESDAY: 2,
		THURSDAY: 3,
		FRIDAY: 4,
		SATURDAY: 5,
		SUNDAY: 6
	},

	/**
	 * The days in OSM
	 */
	OSM_DAYS: [ "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su" ],

	/**
	 * The days IRL
	 */
	IRL_DAYS: [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" ],

	/**
	 * The month in OSM
	 */
	OSM_MONTHS: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ],

	/**
	 * The months IRL
	 */
	IRL_MONTHS: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ],

	/**
	 * The last day of month
	 */
	MONTH_END_DAY: [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ],

	/**
	 * The maximal minute that an interval can have
	 */
	MINUTES_MAX: 1440,

	/**
	 * The maximal value of days
	 */
	DAYS_MAX: 6,

	/**
	 * The weekday ID for PH
	 */
	PH_WEEKDAY: -2
};

module.exports = Constants;
