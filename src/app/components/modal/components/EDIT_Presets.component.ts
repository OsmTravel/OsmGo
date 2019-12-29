import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'edit-presets',
    styleUrls: ['./style.scss'],
    templateUrl: './EDIT_Presets.component.html',
    
})
export class EditPresets {
    @Input() displayCode;
    @Input() tag;
    @Input() language;

    @Output() openPrimaryListModal = new EventEmitter();

    emitOpenModal(tag) {
        if (!this.displayCode && this.tag.preset.type === 'list') {
            this.openPrimaryListModal.emit(tag);
        }
    }
}
