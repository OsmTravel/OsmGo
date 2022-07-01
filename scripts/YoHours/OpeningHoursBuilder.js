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
let OhRule = require('./OhRule')
let Constants = require('./Constants')

/**
 * Class OpeningHoursBuilder, creates opening_hours value from date range object
 */
class OpeningHoursBuilder {
    //OTHER METHODS
    /**
     * Parses several date ranges to create an opening_hours string
     * @param dateRanges The date ranges to parse
     * @return The opening_hours string
     */
    build(dateRanges) {
        let rules = []
        let dateRange,
            ohrules,
            ohrule,
            ohruleAdded,
            ruleId,
            rangeGeneral,
            rangeGeneralFor,
            generalFor

        //Read each date range
        for (let rangeId = 0, l = dateRanges.length; rangeId < l; rangeId++) {
            dateRange = dateRanges[rangeId]

            if (dateRange != undefined) {
                //Check if the defined typical week/day is not strictly equal to a previous wider rule
                rangeGeneral = null
                rangeGeneralFor = null
                let rangeGenId = rangeId - 1
                while (rangeGenId >= 0 && rangeGeneral == null) {
                    if (dateRanges[rangeGenId] != undefined) {
                        generalFor =
                            dateRanges[rangeGenId].isGeneralFor(dateRange)
                        if (
                            dateRanges[rangeGenId].hasSameTypical(dateRange) &&
                            (dateRanges[rangeGenId]
                                .getInterval()
                                .equals(dateRange.getInterval()) ||
                                generalFor)
                        ) {
                            rangeGeneral = rangeGenId
                        } else if (
                            generalFor &&
                            dateRanges[rangeGenId].definesTypicalWeek() &&
                            dateRange.definesTypicalWeek()
                        ) {
                            rangeGeneralFor = rangeGenId //Keep this ID to make differences in order to simplify result
                        }
                    }
                    rangeGenId--
                }

                if (rangeId == 0 || rangeGeneral == null) {
                    //Get rules for this date range
                    if (dateRange.definesTypicalWeek()) {
                        if (rangeGeneralFor != null) {
                            ohrules = this._buildWeekDiff(
                                dateRange,
                                dateRanges[rangeGeneralFor]
                            )
                        } else {
                            ohrules = this._buildWeek(dateRange)
                        }
                    } else {
                        ohrules = this._buildDay(dateRange)
                    }

                    //Process each rule
                    for (
                        let ohruleId = 0, orl = ohrules.length;
                        ohruleId < orl;
                        ohruleId++
                    ) {
                        ohrule = ohrules[ohruleId]
                        ohruleAdded = false
                        ruleId = 0

                        //Try to add them to previously defined ones
                        while (!ohruleAdded && ruleId < rules.length) {
                            //Identical one
                            if (rules[ruleId].sameTime(ohrule)) {
                                try {
                                    for (
                                        let dateId = 0,
                                            dl = ohrule.getDate().length;
                                        dateId < dl;
                                        dateId++
                                    ) {
                                        rules[ruleId].addDate(
                                            ohrule.getDate()[dateId]
                                        )
                                    }
                                    ohruleAdded = true
                                } catch (e) {
                                    //If first date not same kind as in found rule, continue
                                    //But before, try to merge PH with always weekdays
                                    if (
                                        ohrule.getDate()[0].getWideType() ==
                                            'holiday' &&
                                        ohrule.getDate()[0].getWideValue() ==
                                            'PH' &&
                                        rules[ruleId]
                                            .getDate()[0]
                                            .getWideType() == 'always'
                                    ) {
                                        rules[ruleId].addPhWeekday()
                                        ohruleAdded = true
                                    } else if (
                                        rules[ruleId]
                                            .getDate()[0]
                                            .getWideType() == 'holiday' &&
                                        rules[ruleId]
                                            .getDate()[0]
                                            .getWideValue() == 'PH' &&
                                        ohrule.getDate()[0].getWideType() ==
                                            'always'
                                    ) {
                                        ohrule.addPhWeekday()
                                        rules[ruleId] = ohrule
                                        ohruleAdded = true
                                    } else {
                                        ruleId++
                                    }
                                }
                            } else {
                                ruleId++
                            }
                        }

                        //If not, add as new rule
                        if (!ohruleAdded) {
                            rules.push(ohrule)
                        }

                        //If some overwritten weekdays are still in last rule
                        if (
                            ohruleId == orl - 1 &&
                            ohrule.hasOverwrittenWeekday()
                        ) {
                            let ohruleOWD = new OhRule()
                            for (
                                let ohruleDateId = 0;
                                ohruleDateId < ohrule.getDate().length;
                                ohruleDateId++
                            ) {
                                ohruleOWD.addDate(
                                    new OhDate(
                                        ohrule
                                            .getDate()
                                            [ohruleDateId].getWideValue(),
                                        ohrule
                                            .getDate()
                                            [ohruleDateId].getWideType(),
                                        ohrule
                                            .getDate()
                                            [ohruleDateId].getWdOver()
                                    )
                                )
                            }
                            ohruleOWD.addTime(new OhTime())
                            ohrules.push(ohruleOWD)
                            orl++
                        }
                    }
                }
            }
        }

        //Create result string
        let result = ''
        for (let ruleId = 0, l = rules.length; ruleId < l; ruleId++) {
            if (ruleId > 0) {
                result += '; '
            }
            result += rules[ruleId].get()
        }

        return result
    }

    /***********************
     * Top level functions *
     ***********************/

    /**
     * Creates rules for a given typical day
     * @param dateRange The date range defining a typical day
     * @return An array of OhRules
     */
    _buildDay(dateRange) {
        let intervals = dateRange.getTypical().getIntervals(true)
        let interval

        //Create rule
        let rule = new OhRule()
        let date = new OhDate(
            dateRange.getInterval().getTimeSelector(),
            dateRange.getInterval().getType(),
            [-1]
        )
        rule.addDate(date)

        //Read time
        for (let i = 0, l = intervals.length; i < l; i++) {
            interval = intervals[i]

            if (interval != undefined) {
                rule.addTime(new OhTime(interval.getFrom(), interval.getTo()))
            }
        }

        return [rule]
    }

    /**
     * Create rules for a date range defining a typical week
     * Algorithm inspired by OpeningHoursEdit plugin for JOSM
     * @param dateRange The date range defining a typical day
     * @return An array of OhRules
     */
    _buildWeek(dateRange) {
        let result = []
        let intervals = dateRange.getTypical().getIntervals(true)
        let interval, rule, date

        /*
         * Create time intervals per day
         */
        let timeIntervals = this._createTimeIntervals(
            dateRange.getInterval().getTimeSelector(),
            dateRange.getInterval().getType(),
            intervals
        )
        let monday0 = timeIntervals[0]
        let sunday24 = timeIntervals[1]
        let days = timeIntervals[2]

        //Create continuous night for monday-sunday
        days = this._nightMonSun(days, monday0, sunday24)

        /*
         * Group rules with same time
         */
        // 0 means nothing done with this day yet
        // 8 means the day is off
        // -8 means the day is off and should be shown
        // 0<x<8 means the day have the openinghours of day x
        // -8<x<0 means nothing done with this day yet, but it intersects a
        // range of days with same opening_hours
        let daysStatus = []

        //Init status
        for (let i = 0; i < Constants.OSM_DAYS.length; i++) {
            daysStatus[i] = 0
        }

        //Read status
        for (let i = 0; i < days.length; i++) {
            if (days[i].isOff() && daysStatus[i] == 0) {
                daysStatus[i] = 8
            } else if (
                days[i].isOff() &&
                daysStatus[i] < 0 &&
                daysStatus[i] > -8
            ) {
                daysStatus[i] = -8

                //Try to merge with another off day
                let merged = false,
                    mdOff = 0
                while (!merged && mdOff < i) {
                    if (days[mdOff].isOff()) {
                        days[mdOff].addWeekday(i)
                        merged = true
                    } else {
                        mdOff++
                    }
                }

                //If not merged, add it
                if (!merged) {
                    result.push(days[i])
                }
            } else if (daysStatus[i] <= 0 && daysStatus[i] > -8) {
                daysStatus[i] = i + 1
                let lastSameDay = i
                let sameDayCount = 1

                for (let j = i + 1; j < days.length; j++) {
                    if (days[i].sameTime(days[j])) {
                        daysStatus[j] = i + 1
                        days[i].addWeekday(j)
                        lastSameDay = j
                        sameDayCount++
                    }
                }
                if (sameDayCount == 1) {
                    // a single Day with this special opening_hours
                    result.push(days[i])
                } else if (sameDayCount == 2) {
                    // exactly two Days with this special opening_hours
                    days[i].addWeekday(lastSameDay)
                    result.push(days[i])
                } else if (sameDayCount > 2) {
                    // more than two Days with this special opening_hours
                    for (let j = i + 1; j < lastSameDay; j++) {
                        if (daysStatus[j] == 0) {
                            daysStatus[j] = -i - 1
                            days[i].addOverwrittenWeekday(j)
                        }
                    }
                    days[i].addWeekday(lastSameDay)
                    result.push(days[i])
                }
            }
        }

        result = this._mergeDays(result)

        return result
    }

    /**
     * Reads a week to create an opening_hours string for weeks which are overwriting a previous one
     * @param dateRange The date range defining a typical day
     * @param generalDateRange The date range which is wider than this one
     * @return An array of OhRules
     */
    _buildWeekDiff(dateRange, generalDateRange) {
        let intervals = dateRange
            .getTypical()
            .getIntervalsDiff(generalDateRange.getTypical())
        let interval

        /*
         * Create time intervals per day
         */
        //Open
        let timeIntervals = this._createTimeIntervals(
            dateRange.getInterval().getTimeSelector(),
            dateRange.getInterval().getType(),
            intervals.open
        )
        let monday0 = timeIntervals[0]
        let sunday24 = timeIntervals[1]
        let days = timeIntervals[2]

        //Closed
        for (let i = 0, l = intervals.closed.length; i < l; i++) {
            interval = intervals.closed[i]

            for (
                let j = interval.getStartDay();
                j <= interval.getEndDay();
                j++
            ) {
                days[j].addTime(new OhTime())
            }
        }

        //Create continuous night for monday-sunday
        days = this._nightMonSun(days, monday0, sunday24)

        /*
         * Group rules with same time
         */
        // 0 means nothing done with this day yet
        // 8 means the day is off
        // -8 means the day is off and should be shown
        // 0<x<8 means the day have the openinghours of day x
        // -8<x<0 means nothing done with this day yet, but it intersects a
        // range of days with same opening_hours
        let daysStatus = []

        //Init status
        for (let i = 0; i < Constants.OSM_DAYS.length; i++) {
            daysStatus[i] = 0
        }

        //Read rules
        let result = []
        for (let i = 0; i < days.length; i++) {
            //Off day which must be shown
            if (days[i].isOff() && days[i].getTime().length == 1) {
                daysStatus[i] = -8

                //Try to merge with another off day
                let merged = false,
                    mdOff = 0
                while (!merged && mdOff < i) {
                    if (
                        days[mdOff].isOff() &&
                        days[mdOff].getTime().length == 1
                    ) {
                        days[mdOff].addWeekday(i)
                        merged = true
                    } else {
                        mdOff++
                    }
                }

                //If not merged, add it
                if (!merged) {
                    result.push(days[i])
                }
            }
            //Off day which must be hidden
            else if (days[i].isOff() && days[i].getTime().length == 0) {
                daysStatus[i] = 8
            }
            //Non-processed day
            else if (daysStatus[i] <= 0 && daysStatus[i] > -8) {
                daysStatus[i] = i + 1
                let sameDayCount = 1
                let lastSameDay = i

                result.push(days[i])

                for (let j = i + 1; j < days.length; j++) {
                    if (days[i].sameTime(days[j])) {
                        daysStatus[j] = i + 1
                        days[i].addWeekday(j)
                        lastSameDay = j
                        sameDayCount++
                    }
                }
                if (sameDayCount == 1) {
                    // a single Day with this special opening_hours
                    result.push(days[i])
                } else if (sameDayCount == 2) {
                    // exactly two Days with this special opening_hours
                    days[i].addWeekday(lastSameDay)
                    result.push(days[i])
                } else if (sameDayCount > 2) {
                    // more than two Days with this special opening_hours
                    for (let j = i + 1; j < lastSameDay; j++) {
                        if (daysStatus[j] == 0) {
                            daysStatus[j] = -i - 1
                            if (days[j].getTime().length > 0) {
                                days[i].addOverwrittenWeekday(j)
                            }
                        }
                    }
                    days[i].addWeekday(lastSameDay)
                    result.push(days[i])
                }
            }
        }

        result = this._mergeDays(result)

        return result
    }

    /****************************************
     * Utility functions for top-level ones *
     ****************************************/

    /**
     * Merge days with same opening time
     */
    _mergeDays(rules) {
        if (rules.length == 0) {
            return rules
        }

        let result = []
        let dateMerged

        result.push(rules[0])
        let dm = 0,
            wds
        for (let d = 1; d < rules.length; d++) {
            dateMerged = false
            dm = 0
            while (!dateMerged && dm < d) {
                if (rules[dm].sameTime(rules[d])) {
                    wds = rules[d].getDate()[0].getWd()
                    for (let wd = 0; wd < wds.length; wd++) {
                        rules[dm].addWeekday(wds[wd])
                    }
                    dateMerged = true
                }
                dm++
            }

            if (!dateMerged) {
                result.push(rules[d])
            }
        }

        return result
    }

    /**
     * Creates time intervals for each day
     * @return [ monday0, sunday24, days ]
     */
    _createTimeIntervals(timeSelector, type, intervals) {
        let monday0 = -1
        let sunday24 = -1
        let days = []
        let interval

        //Create rule for each day of the week
        for (let i = 0; i < 7; i++) {
            days.push(new OhRule())
            days[i].addDate(new OhDate(timeSelector, type, [i]))
        }

        for (let i = 0, l = intervals.length; i < l; i++) {
            interval = intervals[i]

            if (interval != undefined) {
                //Handle sunday 24:00 with monday 00:00
                if (
                    interval.getStartDay() == Constants.DAYS_MAX &&
                    interval.getEndDay() == Constants.DAYS_MAX &&
                    interval.getTo() == Constants.MINUTES_MAX
                ) {
                    sunday24 = interval.getFrom()
                }
                if (
                    interval.getStartDay() == 0 &&
                    interval.getEndDay() == 0 &&
                    interval.getFrom() == 0
                ) {
                    monday0 = interval.getTo()
                }

                try {
                    //Interval in a single day
                    if (interval.getStartDay() == interval.getEndDay()) {
                        days[interval.getStartDay()].addTime(
                            new OhTime(interval.getFrom(), interval.getTo())
                        )
                    }
                    //Interval on two days
                    else if (
                        interval.getEndDay() - interval.getStartDay() ==
                        1
                    ) {
                        //Continuous night
                        if (interval.getFrom() > interval.getTo()) {
                            days[interval.getStartDay()].addTime(
                                new OhTime(interval.getFrom(), interval.getTo())
                            )
                        }
                        //Separated days
                        else {
                            days[interval.getStartDay()].addTime(
                                new OhTime(
                                    interval.getFrom(),
                                    Constants.MINUTES_MAX
                                )
                            )
                            days[interval.getEndDay()].addTime(
                                new OhTime(0, interval.getTo())
                            )
                        }
                    }
                    //Interval on more than two days
                    else {
                        for (
                            let j = interval.getStartDay(),
                                end = interval.getEndDay();
                            j <= end;
                            j++
                        ) {
                            if (j == interval.getStartDay()) {
                                days[j].addTime(
                                    new OhTime(
                                        interval.getFrom(),
                                        Constants.MINUTES_MAX
                                    )
                                )
                            } else if (j == interval.getEndDay()) {
                                days[j].addTime(new OhTime(0, interval.getTo()))
                            } else {
                                days[j].addTime(
                                    new OhTime(0, Constants.MINUTES_MAX)
                                )
                            }
                        }
                    }
                } catch (e) {
                    console.warn(e)
                }
            }
        }

        return [monday0, sunday24, days]
    }

    /**
     * Changes days array to make sunday - monday night continuous if needed
     */
    _nightMonSun(days, monday0, sunday24) {
        if (monday0 >= 0 && sunday24 >= 0 && monday0 < sunday24) {
            days[0].getTime().sort(this._sortOhTime)
            days[6].getTime().sort(this._sortOhTime)

            //Change sunday interval
            days[6].getTime()[days[6].getTime().length - 1] = new OhTime(
                sunday24,
                monday0
            )

            //Remove monday interval
            days[0].getTime().shift()
        }
        return days
    }

    /**
     * Sort OhTime objects by start hour
     */
    _sortOhTime(a, b) {
        return a.getStart() - b.getStart()
    }
}

module.exports = OpeningHoursBuilder
