import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'edit-primary-key',
    template: `
    	<ion-card (click)="emitOpenModal()">
				<ion-card-header>
					<b *ngIf="!displayCode">{{keyLbl}}</b>
					<b *ngIf="displayCode">{{primaryKey.key}}</b>
				</ion-card-header>

				<ion-card-content>
					<ion-grid>
						<ion-row>
							<ion-col width-90>
								<p *ngIf="!displayCode && configOfPrimaryKey?.lbl"> {{configOfPrimaryKey.lbl}}</p>
								<p *ngIf="displayCode || !configOfPrimaryKey?.lbl"> 
									<i class="fa fa-code"></i> 
                                	{{primaryKey.value}}
                                </p>
							</ion-col>
							<ion-col width-10 class="ion-col10" class="ion-col10">
								<i class="fa fa-cog fa-2x"></i>
							</ion-col>
						</ion-row>
					</ion-grid>
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

    emitOpenModal(){
        this.openPrimaryTagModal.emit();
    }
}