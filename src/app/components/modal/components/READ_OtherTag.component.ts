import { Component, Input } from '@angular/core';

@Component({
    selector: 'read-other-tag',
    template: `
   	    <ion-card>
			<ion-card-header>
					<b>{{tag.key}}</b>
				</ion-card-header>
				<ion-card-content>
				<p><i class="fa fa-code" aria-hidden="true"></i>
				{{tag.value}}</p>
				</ion-card-content>
			</ion-card>
  `
})
export class ReadOtherTag {
    @Input() tag;
}
