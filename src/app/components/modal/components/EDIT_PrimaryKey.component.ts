import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'edit-primary-key',
    styleUrls: ['./style.scss'],
    templateUrl: 'EDIT_PrimaryKey.component.html'
})
export class EditPrimaryKey {
    @Output() openPrimaryTagModal = new EventEmitter();
    @Input() displayCode;
    @Input() keyLbl;
    @Input() primaryKey;
	@Input() configOfPrimaryKey;
	@Input() language;

    emitOpenModal() {
        this.openPrimaryTagModal.emit();
    }
}
