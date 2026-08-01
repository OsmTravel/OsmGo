import {
    Component,
    OnInit,
    Input,
    Output,
    EventEmitter,
    ChangeDetectionStrategy,
} from '@angular/core'

@Component({
    selector: 'app-select',
    templateUrl: './select.component.html',
    styleUrls: ['./select.component.scss', '../style.scss'],
    standalone: false,
})
export class SelectComponent implements OnInit {
    @Input() displayCode
    @Input() tag
    @Input() preset
    @Input() language

    @Output() addTags = new EventEmitter()

    constructor() {}

    ngOnInit() {}

    get selectedValue(): string | number {
        return this.isMultiKeyPreset()
            ? this.tag.value === 'yes'
                ? this.tag.key
                : ''
            : this.tag.value
    }

    selectChange(e) {
        if (!e?.detail) return

        const newValue = e.detail.value
        if (this.isMultiKeyPreset()) {
            const selectedKey = this.preset.keys.includes(newValue)
                ? newValue
                : ''
            this.tag.key = selectedKey
            this.tag.value = selectedKey ? 'yes' : ''
        } else {
            this.tag.value = newValue
        }

        const currentPresetOption = this.preset.options.find(
            (po) => po.v == newValue
        )
        if (currentPresetOption && currentPresetOption.tags) {
            this.addTags.emit(currentPresetOption.tags)
        }
    }

    private isMultiKeyPreset(): boolean {
        return !this.preset.key && Array.isArray(this.preset.keys)
    }
}
