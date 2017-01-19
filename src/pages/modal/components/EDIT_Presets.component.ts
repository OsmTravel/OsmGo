import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'edit-presets',
    template: `
                    <ion-card *ngIf="currentPresets[tag.key]?.type === 'select'">
                        <ion-card-header>
                        	<b *ngIf="!displayCode">{{currentPresets[tag.key]?.lbl}}</b>
						    <b *ngIf="displayCode">{{tag.key}}</b>
                        </ion-card-header>

                        <ion-card-content>
                        <ion-grid>
							<ion-row>

								<ion-col width-90>
                                	<select class="select-md" *ngIf="!displayCode" [(ngModel)]="tag.value"> 
										<option  *ngFor ="let item of currentPresets[tag.key].tags;" [ngValue]="item.v" >  {{item.lbl}} </option>
									</select>
                                    <ion-item *ngIf="displayCode">
										<ion-input type="text" [(ngModel)]="tag.value" [placeholder]="tag.key"></ion-input>
									</ion-item>
                                </ion-col>

								<ion-col width-10>
								<i (click)="tag.value = ''" class="fa fa-times fa-2x"></i>
								</ion-col>
							</ion-row>
						</ion-grid>

                        </ion-card-content>
                    </ion-card>



                   <ion-card *ngIf="currentPresets[tag.key]?.type === 'list'">
                        <ion-card-header  (click)="emitOpenModal()">
                        	<b *ngIf="!displayCode">{{currentPresets[tag.key]?.lbl}} <i  class="fa fa-cog"></i></b>
						    <b *ngIf="displayCode"> {{tag.key}}</b>
                        </ion-card-header>

                        <ion-card-content>
                        <ion-grid>
							<ion-row>
								<ion-col width-90  >
                                    <ion-item *ngIf="!displayCode && findCurrentConfigPresset(tag)" (click)="emitOpenModal()">
                                        <p>{{ findCurrentConfigPresset(tag).lbl }} </p>
                                    </ion-item>
                                   
                                    <ion-item *ngIf="displayCode || !findCurrentConfigPresset(tag)" style="padding-left: 0px">
                                         <ion-label color="primary"> <i class="fa fa-code"></i> </ion-label>
										<ion-input type="text" [(ngModel)]="tag.value" [placeholder]="tag.key"></ion-input>
									</ion-item>
                                </ion-col>
								<ion-col width-10>
									<i (click)="tag.value = ''" class="fa fa-times fa-2x"></i>
								</ion-col>
							</ion-row>
						</ion-grid>
                        </ion-card-content>
                    </ion-card>



                    <ion-card *ngIf="currentPresets[tag.key]?.type === 'number'">
                        <ion-card-header>
                        	<b *ngIf="!displayCode">{{currentPresets[tag.key]?.lbl}}</b>
						    <b *ngIf="displayCode">{{tag.key}}</b>
                        </ion-card-header>

                        <ion-card-content>
                        <ion-grid>
							<ion-row>
								<ion-col width-90>
                                	<ion-item style="padding-left: 0px">
										<ion-input type="number" [(ngModel)]="tag.value" [placeholder]="tag.key"></ion-input>
									</ion-item>
                               
                                </ion-col>
								<ion-col width-10>
									<i (click)="tag.value = ''" class="fa fa-times fa-2x"></i>
								</ion-col>
							</ion-row>
						</ion-grid>
                        </ion-card-content>
                    </ion-card>



                    <ion-card *ngIf="currentPresets[tag.key]?.type === 'text'">
                        <ion-card-header>
                        	<b *ngIf="!displayCode">{{currentPresets[tag.key]?.lbl}}</b>
						    <b *ngIf="displayCode">{{tag.key}}</b>
                        </ion-card-header>

                        <ion-card-content>
                        <ion-grid>
							<ion-row>
								<ion-col width-90>
                                	<ion-item style="padding-left: 0px">
										<ion-input type="text" [(ngModel)]="tag.value" [placeholder]="tag.key"></ion-input>
									</ion-item>
                                </ion-col>
								<ion-col width-10>
									<i (click)="tag.value = ''" class="fa fa-times fa-2x"></i>
								</ion-col>
							</ion-row>
						</ion-grid>
                        </ion-card-content>
                    </ion-card>
  `
})
export class EditPresets {
    @Input() displayCode;
    @Input() currentPresets;
    @Input() tag;

    @Output() openPrimaryListModal = new EventEmitter();

    emitOpenModal(){
        if (!this.displayCode && this.currentPresets[this.tag.key].type == 'list'){
              this.openPrimaryListModal.emit();
        }
    }

    findCurrentConfigPresset(tag) {
        if (this.currentPresets[tag.key]) {
            if (this.currentPresets[tag.key].type == 'list' || this.currentPresets[tag.key].type == 'select') {
                for (let i = 0; i < this.currentPresets[tag.key].tags.length; i++) {
                    if (this.currentPresets[tag.key].tags[i].v == tag.value){
                        return this.currentPresets[tag.key].tags[i];
                    }
                }
            }
            else {
                return  {v: tag.value, lbl: tag.value}
            }
        }
        else { //=> undefined ???
        }
        return null;
    }


}