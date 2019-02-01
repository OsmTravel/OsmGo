import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'edit-other-tag',
    styleUrls: ['./style.scss'],
    template: `
   	    <ion-card>
				<ion-card-header>
				<i class="fa fa-code" aria-hidden="true"></i>	<b>{{tag.key}}</b>
				</ion-card-header>
				<ion-card-content>
				    <div class="wrapperEdit2cols">
				        <div class="contentEdit2cols">
								<ion-item>
									<ion-input type="text" [(ngModel)]="tag.value" [placeholder]="tag.key"></ion-input>
								</ion-item>
						</div>

						<div class="buttonEdit2cols">
							<i (click)="eventDeleteTag(tag)" class="fa fa-times fa-2x"></i>
						</div>
					</div>

				</ion-card-content>
			</ion-card>
  `
})
export class EditOtherTag {
    @Input() tag;
    @Output() deleteTag = new EventEmitter();

    eventDeleteTag() {
        this.deleteTag.emit(this.tag);
    }


}
