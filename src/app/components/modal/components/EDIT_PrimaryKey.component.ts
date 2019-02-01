import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'edit-primary-key',
    styleUrls: ['./style.scss'],
    template: `
    	<ion-card (click)="emitOpenModal()">
				<ion-card-header>
					<b *ngIf="!displayCode">{{keyLbl}}</b>
					<b *ngIf="displayCode">{{primaryKey.key}}</b>
				</ion-card-header>

				<ion-card-content >

				<div class="wrapperEdit2cols">
							<div class="contentEdit2cols">
								<p class="primaryKeyLabel" *ngIf="!displayCode && configOfPrimaryKey?.lbl"> {{configOfPrimaryKey.lbl}}</p>
								<p class="primaryKeyLabel" *ngIf="displayCode || !configOfPrimaryKey?.lbl">
									<i class="fa fa-code"></i>
                                	{{primaryKey.value}}
                                </p>
							</div>
							<div class="buttonEdit2cols">
								<i class="fa fa-cog fa-2x"></i>
							</div>
				</div>

				</ion-card-content>
			</ion-card>
  `
})
export class EditPrimaryKey {
    @Output() openPrimaryTagModal = new EventEmitter();
    @Input() displayCode;
    @Input() keyLbl;
    @Input() primaryKey;
    @Input() configOfPrimaryKey;

    emitOpenModal() {
        this.openPrimaryTagModal.emit();
    }
}
