import { Component, Input, Output, EventEmitter } from '@angular/core'
import { OsmGoFeature, PrimaryTag } from '../../../../type'

@Component({
    selector: 'edit-primary-key',
    styleUrls: ['./style.scss'],
    templateUrl: 'EDIT_PrimaryKey.component.html',
})
export class EditPrimaryKey {
    @Output() openPrimaryTagModal = new EventEmitter()

    @Input() displayCode
    @Input() tagsConfig
    @Input() tagConfig
    @Input() language
    @Input() jsonSprites
    @Input() feature: OsmGoFeature
    @Input() primaryKey: PrimaryTag

    ngOnInit(): void {}
    emitOpenModal() {
        this.openPrimaryTagModal.emit()
    }
}
