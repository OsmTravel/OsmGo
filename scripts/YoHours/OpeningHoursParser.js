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

let Constants = require("./Constants");
let DateRange = require("./DateRange");
let Day = require("./Day");
let Interval = require("./Interval");
let WideInterval = require("./WideInterval");


//CONSTANTS
const RGX_RULE_MODIFIER = /^(open|closed|off)$/i;
const RGX_WEEK_KEY = /^week$/;
const RGX_WEEK_VAL = /^([01234]?[0-9]|5[0123])(\-([01234]?[0-9]|5[0123]))?(,([01234]?[0-9]|5[0123])(\-([01234]?[0-9]|5[0123]))?)*\:?$/;
const RGX_MONTH = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))?\:?$/;
const RGX_MONTHDAY = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([012]?[0-9]|3[01])(\-((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) )?([012]?[0-9]|3[01]))?\:?$/;
const RGX_TIME = /^((([01]?[0-9]|2[01234])\:[012345][0-9](\-([01]?[0-9]|2[01234])\:[012345][0-9])?(,([01]?[0-9]|2[01234])\:[012345][0-9](\-([01]?[0-9]|2[01234])\:[012345][0-9])?)*)|(24\/7))$/;
const RGX_WEEKDAY = /^(((Mo|Tu|We|Th|Fr|Sa|Su)(\-(Mo|Tu|We|Th|Fr|Sa|Su))?)|(PH|SH|easter))(,(((Mo|Tu|We|Th|Fr|Sa|Su)(\-(Mo|Tu|We|Th|Fr|Sa|Su))?)|(PH|SH|easter)))*$/;
const RGX_HOLIDAY = /^(PH|SH|easter)$/;
const RGX_WD = /^(Mo|Tu|We|Th|Fr|Sa|Su)(\-(Mo|Tu|We|Th|Fr|Sa|Su))?$/;


/**
 * Class OpeningHoursParser, creates DateRange/Week/Day objects from opening_hours string
 * Based on a subpart of grammar defined at http://wiki.openstreetmap.org/wiki/Key:opening_hours/specification
 */
class OpeningHoursParser {
//OTHER METHODS
	/**
	 * Parses the given opening_hours string
	 * @param oh The opening_hours string
	 * @return An array of date ranges
	 */
	parse(oh) {
		let result = [];
		
		//Separate each block
		let blocks = oh.split(';');
		
		/*
		 * Blocks parsing
		 * Each block can be divided in three parts: wide range selector, small range selector, rule modifier.
		 * The last two are simpler to parse, so we start to read rule modifier, then small range selector.
		 * All the lasting tokens are part of wide range selector.
		 */
		
		let block, tokens, currentToken, ruleModifier, timeSelector, weekdaySelector, wideRangeSelector;
		let singleTime, from, to, times;
		let singleWeekday, wdStart, wdEnd, holidays, weekdays;
		let monthSelector, weekSelector, weeks, singleWeek, weekFrom, weekTo, singleMonth, months, monthFrom, monthTo, wdFrom, wdTo;
		let dateRanges, dateRange, drObj, foundDateRange, resDrId;
		
		//Read each block
		for(let i=0, li=blocks.length; i < li; i++) {
			block = blocks[i].trim();
			
			if(block.length == 0) { continue; } //Don't parse empty blocks
			
			tokens = this._tokenize(block);
			currentToken = tokens.length - 1;
			ruleModifier = null;
			timeSelector = null;
			weekdaySelector = null;
			wideRangeSelector = null;
			
			//console.log(tokens);
			
			/*
			 * Rule modifier (open, closed, off)
			 */
			if(currentToken >= 0 && this._isRuleModifier(tokens[currentToken])) {
				//console.log("rule modifier",tokens[currentToken]);
				ruleModifier = tokens[currentToken].toLowerCase();
				currentToken--;
			}
			
			/*
			 * Small range selectors
			 */
			from = null;
			to = null;
			times = []; //Time intervals in minutes
			
			//Time selector
			if(currentToken >= 0 && this._isTime(tokens[currentToken])) {
				timeSelector = tokens[currentToken];
				
				if(timeSelector == "24/7") {
					times.push({from: 0, to: 24*60});
				}
				else {
					//Divide each time interval
					timeSelector = timeSelector.split(',');
					for(let ts=0, tsl = timeSelector.length; ts < tsl; ts++) {
						//Separate start and end values
						singleTime = timeSelector[ts].split('-');
						from = this._asMinutes(singleTime[0]);
						if(singleTime.length > 1) {
							to = this._asMinutes(singleTime[1]);
						}
						else {
							to = from;
						}
						times.push({from: from, to: to});
					}
				}
				
				currentToken--;
			}
			
			holidays = [];
			weekdays = [];
			
			//Weekday selector
			if(timeSelector == "24/7") {
				weekdays.push({from: 0, to: 6});
			}
			else if(currentToken >= 0 && this._isWeekday(tokens[currentToken])) {
				weekdaySelector = tokens[currentToken];
				
				//Divide each weekday
				weekdaySelector = weekdaySelector.split(',');
				
				for(let wds=0, wdsl = weekdaySelector.length; wds < wdsl; wds++) {
					singleWeekday = weekdaySelector[wds];
					
					//Holiday
					if(RGX_HOLIDAY.test(singleWeekday)) {
						holidays.push(singleWeekday);
					}
					//Weekday interval
					else if(RGX_WD.test(singleWeekday)) {
						singleWeekday = singleWeekday.split('-');
						wdFrom = Constants.OSM_DAYS.indexOf(singleWeekday[0]);
						if(singleWeekday.length > 1) {
							wdTo = Constants.OSM_DAYS.indexOf(singleWeekday[1]);
						}
						else {
							wdTo = wdFrom;
						}
						weekdays.push({from: wdFrom, to: wdTo});
					}
					else {
						throw new Error("Invalid weekday interval: "+singleWeekday);
					}
				}
				
				currentToken--;
			}
			
			/*
			 * Wide range selector
			 */
			weeks = [];
			months = [];
			
			if(currentToken >= 0) {
				wideRangeSelector = tokens[0];
				for(let ct=1; ct <= currentToken; ct++) {
					wideRangeSelector += " "+tokens[ct];
				}
				
				if(wideRangeSelector.length > 0) {
					wideRangeSelector = wideRangeSelector.replace(/\:$/g, '').split('week'); //0 = Month or SH, 1 = weeks
					
					//Month or SH
					monthSelector = wideRangeSelector[0].trim();
					if(monthSelector.length == 0) { monthSelector = null; }
					
					//Weeks
					if(wideRangeSelector.length > 1) {
						weekSelector = wideRangeSelector[1].trim();
						if(weekSelector.length == 0) { weekSelector = null; }
					}
					else { weekSelector = null; }
					
					if(monthSelector != null && weekSelector != null) {
						throw new Error("Unsupported simultaneous month and week selector");
					}
					else if(monthSelector != null) {
						monthSelector = monthSelector.split(',');
						
						for(let ms=0, msl = monthSelector.length; ms < msl; ms++) {
							singleMonth = monthSelector[ms];
							
							//School holidays
							if(singleMonth == "SH") {
								months.push({holiday: "SH"});
							}
							//Month intervals
							else if(RGX_MONTH.test(singleMonth)) {
								singleMonth = singleMonth.split('-');
								monthFrom = Constants.OSM_MONTHS.indexOf(singleMonth[0])+1;
								if(monthFrom < 1) {
									throw new Error("Invalid month: "+singleMonth[0]);
								}
								
								if(singleMonth.length > 1) {
									monthTo = Constants.OSM_MONTHS.indexOf(singleMonth[1])+1;
									if(monthTo < 1) {
										throw new Error("Invalid month: "+singleMonth[1]);
									}
								}
								else {
									monthTo = null;
								}
								months.push({from: monthFrom, to: monthTo});
							}
							//Monthday intervals
							else if(RGX_MONTHDAY.test(singleMonth)) {
								singleMonth = singleMonth.replace(/\:/g, '').split('-');
								
								//Read monthday start
								monthFrom = singleMonth[0].split(' ');
								monthFrom = { day: parseInt(monthFrom[1],10), month: Constants.OSM_MONTHS.indexOf(monthFrom[0])+1 };
								if(monthFrom.month < 1) {
									throw new Error("Invalid month: "+monthFrom[0]);
								}
								
								if(singleMonth.length > 1) {
									monthTo = singleMonth[1].split(' ');
									
									//Same month as start
									if(monthTo.length == 1) {
										monthTo = { day: parseInt(monthTo[0],10), month: monthFrom.month };
									}
									//Another month
									else {
										monthTo = { day: parseInt(monthTo[1],10), month: Constants.OSM_MONTHS.indexOf(monthTo[0])+1 };
										if(monthTo.month < 1) {
											throw new Error("Invalid month: "+monthTo[0]);
										}
									}
								}
								else {
									monthTo = null;
								}
								months.push({fromDay: monthFrom, toDay: monthTo});
							}
							//Unsupported
							else {
								throw new Error("Unsupported month selector: "+singleMonth);
							}
						}
					}
					else if(weekSelector != null) {
						//Divide each week interval
						weekSelector = weekSelector.split(',');
						
						for(let ws=0, wsl = weekSelector.length; ws < wsl; ws++) {
							singleWeek = weekSelector[ws].split('-');
							weekFrom = parseInt(singleWeek[0],10);
							if(singleWeek.length > 1) {
								weekTo = parseInt(singleWeek[1],10);
							}
							else {
								weekTo = null;
							}
							weeks.push({from: weekFrom, to: weekTo});
						}
					}
					else {
						throw Error("Invalid date selector");
					}
				}
			}
			
			//If no read token, throw error
			if(currentToken == tokens.length - 1) {
				throw Error("Unreadable string");
			}
			
 			// console.log("months",months);
 			// console.log("weeks",weeks);
 			// console.log("holidays",holidays);
 			// console.log("weekdays",weekdays);
 			// console.log("times",times);
 			// console.log("rule",ruleModifier);
			
			/*
			 * Create date ranges
			 */
			dateRanges = [];
			
			//Month range
			if(months.length > 0) {
				for(let mId=0, ml = months.length; mId < ml; mId++) {
					singleMonth = months[mId];
					
					if(singleMonth.holiday != undefined) {
						dateRanges.push(new WideInterval().holiday(singleMonth.holiday));
					}
					else if(singleMonth.fromDay != undefined) {
						if(singleMonth.toDay != null) {
							dateRange = new WideInterval().day(singleMonth.fromDay.day, singleMonth.fromDay.month, singleMonth.toDay.day, singleMonth.toDay.month);
						}
						else {
							dateRange = new WideInterval().day(singleMonth.fromDay.day, singleMonth.fromDay.month);
						}
						dateRanges.push(dateRange);
					}
					else {
						if(singleMonth.to != null) {
							dateRange = new WideInterval().month(singleMonth.from, singleMonth.to);
						}
						else {
							dateRange = new WideInterval().month(singleMonth.from);
						}
						dateRanges.push(dateRange);
					}
				}
			}
			//Week range
			else if(weeks.length > 0) {
				for(let wId=0, wl = weeks.length; wId < wl; wId++) {
					if(weeks[wId].to != null) {
						dateRange = new WideInterval().week(weeks[wId].from, weeks[wId].to);
					}
					else {
						dateRange = new WideInterval().week(weeks[wId].from);
					}
					dateRanges.push(dateRange);
				}
			}
			//Holiday range
			else if(holidays.length > 0) {
				for(let hId=0, hl = holidays.length; hId < hl; hId++) {
					dateRanges.push(new WideInterval().holiday(holidays[hId]));
					if(holidays[hId] == "PH" && weekdays.length > 0 && months.length == 0 && weeks.length == 0) {
						dateRanges.push(new WideInterval().always());
					}
				}
			}
			//Full year range
			else {
				dateRanges.push(new WideInterval().always());
			}
			
			//Case of no weekday defined = all week
			if(weekdays.length == 0) {
				if(holidays.length == 0 || (holidays.length == 1 && holidays[0] == "SH")) {
					weekdays.push({from: 0, to: Constants.OSM_DAYS.length -1 });
				}
				else {
					weekdays.push({from: 0, to: 0 });
				}
			}
			
			//Case of no time defined = all day
			if(times.length == 0) {
				times.push({from: 0, to: 24*60});
			}
			
			/*
			 * Create date range objects
			 */
			for(let drId = 0, drl=dateRanges.length; drId < drl; drId++) {
				/*
				 * Find an already defined date range or create new one
				 */
				foundDateRange = false;
				resDrId=0;
				while(resDrId < result.length && !foundDateRange) {
					if(result[resDrId].getInterval().equals(dateRanges[drId])) {
						foundDateRange = true;
					}
					else {
						resDrId++;
					}
				}
				
				if(foundDateRange) {
					drObj = result[resDrId];
				}
				else {
					drObj = new DateRange(dateRanges[drId]);
					
					//Find general date range that may be refined by this one
					let general = -1;
					for(resDrId=0; resDrId < result.length; resDrId++) {
						if(result[resDrId].isGeneralFor(new DateRange(dateRanges[drId]))) {
							general = resDrId;
						}
					}
					
					//Copy general date range intervals
					if(general >= 0 && drObj.definesTypicalWeek()) {
						drObj.getTypical().copyIntervals(result[general].getTypical().getIntervals());
					}
					
					result.push(drObj);
				}
				
				/*
				 * Add time intervals
				 */
				//For each weekday
				for(let wdId=0, wdl=weekdays.length; wdId < wdl; wdId++) {
					//Remove overlapping days
					if(weekdays[wdId].from <= weekdays[wdId].to) {
						for(let wdRm=weekdays[wdId].from; wdRm <= weekdays[wdId].to; wdRm++) {
							if(drObj.definesTypicalWeek()) {
								drObj.getTypical().removeIntervalsDuringDay(wdRm);
							}
							else {
								drObj.getTypical().clearIntervals();
							}
						}
					}
					else {
						for(let wdRm=weekdays[wdId].from; wdRm <= 6; wdRm++) {
							if(drObj.definesTypicalWeek()) {
								drObj.getTypical().removeIntervalsDuringDay(wdRm);
							}
							else {
								drObj.getTypical().clearIntervals();
							}
						}
						for(let wdRm=0; wdRm <= weekdays[wdId].to; wdRm++) {
							if(drObj.definesTypicalWeek()) {
								drObj.getTypical().removeIntervalsDuringDay(wdRm);
							}
							else {
								drObj.getTypical().clearIntervals();
							}
						}
					}
					
					//For each time interval
					for(let tId=0, tl=times.length; tId < tl; tId++) {
						if(ruleModifier == "closed" || ruleModifier == "off") {
							this._removeInterval(drObj.getTypical(), weekdays[wdId], times[tId]);
						}
						else {
							this._addInterval(drObj.getTypical(), weekdays[wdId], times[tId]);
						}
					}
				}
			}
		}
		
		return result;
	}

	/**
	 * Remove intervals from given typical day/week
	 * @param typical The typical day or week
	 * @param weekdays The concerned weekdays
	 * @param times The concerned times
	 */
	_removeInterval(typical, weekdays, times) {
		if(weekdays.from <= weekdays.to) {
			for(let wd=weekdays.from; wd <= weekdays.to; wd++) {
				this._removeIntervalWd(typical, times, wd);
			}
		}
		else {
			for(let wd=weekdays.from; wd <= 6; wd++) {
				this._removeIntervalWd(typical, times, wd);
			}
			for(let wd=0; wd <= weekdays.to; wd++) {
				this._removeIntervalWd(typical, times, wd);
			}
		}
	}
	
	/**
	 * Remove intervals from given typical day/week for a given weekday
	 * @param typical The typical day or week
	 * @param times The concerned times
	 * @param wd The concerned weekday
	 */
	_removeIntervalWd(typical, times, wd) {
		//Interval during day
		if(times.to >= times.from) {
			typical.removeInterval(
				new Interval(wd, wd, times.from, times.to)
			);
		}
		//Interval during night
		else {
			//Everyday except sunday
			if(wd < 6) {
				typical.removeInterval(
					new Interval(wd, wd+1, times.from, times.to)
				);
			}
			//Sunday
			else {
				typical.removeInterval(
					new Interval(wd, wd, times.from, 24*60)
				);
				typical.removeInterval(
					new Interval(0, 0, 0, times.to)
				);
			}
		}
	}
	
	/**
	 * Adds intervals from given typical day/week
	 * @param typical The typical day or week
	 * @param weekdays The concerned weekdays
	 * @param times The concerned times
	 */
	_addInterval(typical, weekdays, times) {
		//Check added interval are OK for days
		if(typical instanceof Day) {
			if(weekdays.from != 0 || (weekdays.to != 0 && times.from <= times.to)) {
				weekdays = Object.assign({}, weekdays);
				weekdays.from = 0;
				weekdays.to = (times.from <= times.to) ? 0 : 1;
			}
		}
		
		if(weekdays.from <= weekdays.to) {
			for(let wd=weekdays.from; wd <= weekdays.to; wd++) {
				this._addIntervalWd(typical, times, wd);
			}
		}
		else {
			for(let wd=weekdays.from; wd <= 6; wd++) {
				this._addIntervalWd(typical, times, wd);
			}
			for(let wd=0; wd <= weekdays.to; wd++) {
				this._addIntervalWd(typical, times, wd);
			}
		}
	}
	
	/**
	 * Adds intervals from given typical day/week for a given weekday
	 * @param typical The typical day or week
	 * @param times The concerned times
	 * @param wd The concerned weekday
	 */
	_addIntervalWd(typical, times, wd) {
		//Interval during day
		if(times.to >= times.from) {
			typical.addInterval(
				new Interval(wd, wd, times.from, times.to)
			);
		}
		//Interval during night
		else {
			//Everyday except sunday
			if(wd < 6) {
				typical.addInterval(
					new Interval(wd, wd+1, times.from, times.to)
				);
			}
			//Sunday
			else {
				typical.addInterval(
					new Interval(wd, wd, times.from, 24*60)
				);
				typical.addInterval(
					new Interval(0, 0, 0, times.to)
				);
			}
		}
	}
	
	/**
	 * Converts a time string "12:45" into minutes integer
	 * @param time The time string
	 * @return The amount of minutes since midnight
	 */
	_asMinutes(time) {
		let values = time.split(':');
		return parseInt(values[0],10) * 60 + parseInt(values[1],10);
	}
	
	/**
	 * Is the given token a weekday selector ?
	 */
	_isWeekday(token) {
		return RGX_WEEKDAY.test(token);
	}
	
	/**
	 * Is the given token a time selector ?
	 */
	_isTime(token) {
		return RGX_TIME.test(token);
	}
	
	/**
	 * Is the given token a rule modifier ?
	 */
	_isRuleModifier(token) {
		return RGX_RULE_MODIFIER.test(token);
	}
	
	/**
	 * Create tokens for a given block
	 */
	_tokenize(block) {
		let result = block.trim().split(' ');
		let position = result.indexOf("");
		while( ~position ) {
			result.splice(position, 1);
			position = result.indexOf("");
		}
		return result;
	}
	
	_printIntervals(from, intervals) {
		console.log("From: "+from);
		if(intervals.length > 0) {
			console.log("-------------------------");
			for(let i=0; i < intervals.length; i++) {
				if(intervals[i] == undefined) {
					console.log(i+": "+undefined);
				}
				else {
					console.log(i+": "+intervals[i].getStartDay()+", "+intervals[i].getEndDay()+", "+intervals[i].getFrom()+", "+intervals[i].getTo());
				}
			}
			console.log("-------------------------");
		}
		else {
			console.log("Empty intervals");
		}
	}
}

module.exports = OpeningHoursParser;
