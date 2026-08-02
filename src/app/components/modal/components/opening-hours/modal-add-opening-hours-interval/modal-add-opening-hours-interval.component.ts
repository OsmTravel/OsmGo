import { Component, computed, inject, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { TranslateModule } from '@ngx-translate/core'
import { CharLimitPipe } from '@pipes/charLimit.pipe'

export interface OpeningHoursTime {
    start: string
    end: string
}

interface OpeningHoursTimeRange extends OpeningHoursTime {
    id: number
}

export interface OpeningHoursDay {
    index: number
    selected: boolean
    label: string
}

export interface OpeningHoursScheduleGroup {
    days: OpeningHoursDay[]
    times: OpeningHoursTime[]
}

export interface OpeningHoursDialogData {
    groups: OpeningHoursScheduleGroup[]
}

export interface OpeningHoursDialogResult {
    groups: OpeningHoursScheduleGroup[]
}

interface EditableScheduleGroup {
    id: number
    days: OpeningHoursDay[]
    times: OpeningHoursTimeRange[]
}

const DAY_LABELS = [
    'DAYS.MONDAY',
    'DAYS.TUESDAY',
    'DAYS.WEDNESDAY',
    'DAYS.THURSDAY',
    'DAYS.FRIDAY',
    'DAYS.SATURDAY',
    'DAYS.SUNDAY',
]

const START_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const END_TIME_PATTERN = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/

const timeToMinutes = (value: string): number => {
    const [hours, minutes] = value.split(':').map(Number)
    return hours * 60 + minutes
}

export function openingHoursScheduleIsValid(
    groups: OpeningHoursScheduleGroup[]
): boolean {
    if (groups.length === 0) return false
    const intervalsByDay = new Map<number, Array<[number, number]>>()

    for (const group of groups) {
        const selectedDays = group.days
            .filter((day) => day.selected)
            .map((day) => day.index)
        if (selectedDays.length === 0 || group.times.length === 0) return false

        const intervals: Array<[number, number]> = []
        for (const time of group.times) {
            if (
                !START_TIME_PATTERN.test(time.start) ||
                !END_TIME_PATTERN.test(time.end)
            ) {
                return false
            }
            const start = timeToMinutes(time.start)
            const end = timeToMinutes(time.end)
            if (end <= start) return false
            intervals.push([start, end])
        }

        for (const day of selectedDays) {
            intervalsByDay.set(day, [
                ...(intervalsByDay.get(day) ?? []),
                ...intervals,
            ])
        }
    }

    for (const intervals of intervalsByDay.values()) {
        intervals.sort(([left], [right]) => left - right)
        for (let index = 1; index < intervals.length; index++) {
            if (intervals[index][0] < intervals[index - 1][1]) return false
        }
    }
    return true
}

@Component({
    selector: 'app-modal-add-opening-hours-interval',
    templateUrl: './modal-add-opening-hours-interval.component.html',
    styleUrls: ['./modal-add-opening-hours-interval.component.scss'],
    imports: [
        CharLimitPipe,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        TranslateModule,
    ],
})
export class ModalAddOpeningHoursIntervalComponent {
    private readonly dialogRef = inject(
        MatDialogRef<ModalAddOpeningHoursIntervalComponent>
    )
    private readonly data = inject<OpeningHoursDialogData>(MAT_DIALOG_DATA, {
        optional: true,
    })
    private nextTimeRangeId = 0
    private nextGroupId = 0

    readonly groups = signal<EditableScheduleGroup[]>(
        this.createInitialGroups(this.data?.groups)
    )

    readonly groupsAreValid = computed(() =>
        openingHoursScheduleIsValid(this.groups())
    )

    dayIsSelected(group: EditableScheduleGroup): boolean {
        return group.days.some((day) => day.selected)
    }

    updateTimeRange(
        groupId: number,
        timeId: number,
        field: 'start' | 'end',
        value: string
    ): void {
        this.groups.update((groups) =>
            groups.map((group) =>
                group.id === groupId
                    ? {
                          ...group,
                          times: group.times.map((time) =>
                              time.id === timeId
                                  ? { ...time, [field]: value }
                                  : time
                          ),
                      }
                    : group
            )
        )
    }

    addNewInterval(groupId: number): void {
        this.groups.update((groups) =>
            groups.map((group) =>
                group.id === groupId
                    ? {
                          ...group,
                          times: [...group.times, this.createTimeRange()],
                      }
                    : group
            )
        )
    }

    removeInterval(groupId: number, timeId: number): void {
        this.groups.update((groups) =>
            groups.map((group) =>
                group.id === groupId
                    ? {
                          ...group,
                          times: group.times.filter(
                              (time) => time.id !== timeId
                          ),
                      }
                    : group
            )
        )
    }

    toggleDay(groupId: number, dayIndex: number): void {
        this.groups.update((groups) =>
            groups.map((group) =>
                group.id === groupId
                    ? {
                          ...group,
                          days: group.days.map((day) =>
                              day.index === dayIndex
                                  ? { ...day, selected: !day.selected }
                                  : day
                          ),
                      }
                    : group
            )
        )
    }

    addScheduleGroup(): void {
        this.groups.update((groups) => [...groups, this.createGroup()])
    }

    removeScheduleGroup(groupId: number): void {
        this.groups.update((groups) =>
            groups.filter((group) => group.id !== groupId)
        )
    }

    cancel(): void {
        this.dialogRef.close(null)
    }

    submit(): void {
        if (!this.groupsAreValid()) return

        const groups = this.groups().map((group) => ({
            days: group.days.map((day) => ({ ...day })),
            times: group.times.map(({ start, end }) => ({ start, end })),
        }))
        this.dialogRef.close({ groups })
    }

    private createInitialGroups(
        groups: OpeningHoursScheduleGroup[] | undefined
    ): EditableScheduleGroup[] {
        if (!groups?.length) return [this.createGroup()]
        return groups.map((group) => this.createGroup(group))
    }

    private createGroup(
        group?: OpeningHoursScheduleGroup
    ): EditableScheduleGroup {
        return {
            id: this.nextGroupId++,
            days: DAY_LABELS.map((label, index) => ({
                index,
                selected:
                    group?.days.find((day) => day.index === index)?.selected ??
                    false,
                label,
            })),
            times: group?.times.length
                ? group.times.map((time) => this.createTimeRange(time))
                : [this.createTimeRange()],
        }
    }

    private createTimeRange(
        time: OpeningHoursTime = { start: '09:00', end: '12:00' }
    ): OpeningHoursTimeRange {
        return { id: this.nextTimeRangeId++, ...time }
    }
}
