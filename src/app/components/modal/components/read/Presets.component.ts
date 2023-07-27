import { Component, Input } from '@angular/core'

@Component({
    selector: 'read-presets',
    templateUrl: 'Presets.component.html',
})
export class ReadPresets {
    @Input() displayCode
    @Input() tag
    @Input() preset
    @Input() language
    @Input() countryCode

    ngOnInit(): void {}
}
