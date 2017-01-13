import { Component, Input } from '@angular/core';

@Component({
    selector: 'read-meta',
    template: `
  	<ion-card style="background-color: #f4f4f4;">
		<ion-card-content>
			Version : {{meta?.version}} <br> Modifié le : {{meta.timestamp | date:'dd/MM/yyyy
			HH:mm'}}
			<!-- | date:'dd/MM/yyyy HH:mm'-->
			<br> Par : {{meta?.user}}
		</ion-card-content>
	</ion-card>
  `
})
export class ReadMeta {
    @Input() meta;
}