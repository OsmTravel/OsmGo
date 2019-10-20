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
								<p class="description" *ngIf="!displayCode && configOfPrimaryKey && configOfPrimaryKey.description"> {{configOfPrimaryKey.description}}</p>

								<p class="primaryKeyLabel" *ngIf="displayCode || !configOfPrimaryKey?.lbl">
								<ion-icon name="code"></ion-icon>
                                	{{primaryKey.value}}
                                </p>
							</div>
							<div class="buttonEdit2cols">
								<ion-icon name="settings" style="width: 2em; height: 2em;"></ion-icon>
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
