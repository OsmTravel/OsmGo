import { Component, Input, Output, EventEmitter } from '@angular/core'

@Component({
    selector: 'edit-presets',
    styleUrls: ['../style.scss'],
    templateUrl: './Presets.component.html',
})
export class EditPresets {
    @Input() displayCode
    @Input() tag
    @Input() language
    @Input() preset

    @Output() openPrimaryListModal = new EventEmitter()
    @Output() addTags = new EventEmitter()

    get isMultiKeyPreset(): boolean {
        return (
            !this.preset?.key &&
            this.preset?.keys?.length > 0 &&
            this.preset?.options?.length > 0
        )
    }

    emitOpenModal(tag) {
        if (!this.displayCode && this.preset.type === 'list') {
            this.openPrimaryListModal.emit(tag)
        }
    }
}
