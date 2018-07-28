import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'edit-other-tag',
    template: `
   	    <ion-card>
				<ion-card-header>
					<b>{{tag.key}}</b>
				</ion-card-header>
				<ion-card-content>
					<ion-grid>
						<ion-row>
							<ion-col width-90>
								<ion-item>
									<ion-input type="text" [(ngModel)]="tag.value" [placeholder]="tag.key"></ion-input>
								</ion-item>
							</ion-col>
							<ion-col width-10 class="ion-col10">
								<i (click)="eventDeleteTag(tag)" class="fa fa-times fa-2x"></i>
							</ion-col>
						</ion-row>
					</ion-grid>
				</ion-card-content>
			</ion-card>
  `
})
export class EditOtherTag {
    @Input() tag;
	@Output() deleteTag = new EventEmitter();

	eventDeleteTag(){
		this.deleteTag.emit(this.tag)

	}

	
}