import { Component, Input } from '@angular/core';

@Component({
    selector: 'read-primary-key',
    styleUrls: ['./style.scss'],
    template: `
   	<ion-card>
        <ion-card-header>
            <b *ngIf="!displayCode">{{keyLbl}}</b>
            <b *ngIf="displayCode">{{primaryKey.key}}</b>
        </ion-card-header>
        <ion-card-content>
            <p class="primaryKeyLabel" *ngIf="!displayCode && configOfPrimaryKey?.lbl"> {{configOfPrimaryKey.lbl}}</p>
            <p class="description" *ngIf="!displayCode && configOfPrimaryKey && configOfPrimaryKey.description"> {{configOfPrimaryKey.description}}</p>
           
            <p class="primaryKeyLabel" *ngIf="displayCode || !configOfPrimaryKey?.lbl">
            <ion-icon name="code"></ion-icon>
                {{primaryKey.value}}
            </p>
        </ion-card-content>
	</ion-card>
  `
})
export class ReadPrimaryKey {
    @Input() displayCode;
    @Input() keyLbl;
    @Input() primaryKey;
    @Input() configOfPrimaryKey;
}
