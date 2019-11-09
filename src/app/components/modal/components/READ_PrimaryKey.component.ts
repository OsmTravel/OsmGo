import { Component, Input } from '@angular/core';

@Component({
    selector: 'read-primary-key',
    styleUrls: ['./style.scss'],
    templateUrl: 'READ_PrimaryKey.component.html'
})
export class ReadPrimaryKey {
    @Input() displayCode;
    @Input() keyLbl;
    @Input() primaryKey;
    @Input() configOfPrimaryKey;
    @Input() language;

    ngOnInit(): void {
    }
}
