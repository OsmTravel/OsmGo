import { Component, Input } from '@angular/core';

@Component({
    selector: 'read-meta',
    template: `
  	<ion-card  color="primary">
		<ion-card-content>
			Version : {{meta?.version}} <br>
			<span *ngIf="meta.timestamp === 0">
				En cours de création
			</span>
			<span *ngIf="meta.timestamp !== 0">
				{{meta?.version > 1 ? 'Modifié' : 'Créé'}}
			</span>
			<span *ngIf="displayCode && meta.timestamp !== 0 ">
			 le : {{ meta.timestamp | date:'dd/MM/yyyy HH:mm'}}
			</span>
			<span *ngIf="!displayCode && meta.timestamp !== 0" >
			 {{  meta.timestamp | amTimeAgo}}
			</span>
			<br> Par : {{meta?.user ? meta?.user : 'Moi même'}}
		</ion-card-content>
	</ion-card>
  `
})
export class ReadMeta {
    @Input() meta;
    @Input() displayCode;
}
