import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'minutesToHoursMinutes',
    standalone: false,
})
export class MinutesToHoursMinutesPipe implements PipeTransform {
    transform(_minutes: number): string {
        let hours = Math.floor(_minutes / 60)
        let min = _minutes % 60
        let strMin = min.toString()
        if (strMin.length == 1) {
            strMin = `0${strMin}`
        }

        let strHours = hours.toString()
        if (strHours.length == 1) {
            strHours = `0${strHours}`
        }
        return strHours + ':' + strMin
    }
}
