import { Component, Input, ChangeDetectionStrategy } from '@angular/core'

@Component({
    selector: 'read-presets',
    templateUrl: 'Presets.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class ReadPresets {
    @Input() displayCode
    @Input() tag
    @Input() preset
    @Input() language
    @Input() countryCode

    ngOnInit(): void {}
}
