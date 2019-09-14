import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'edit-presets',
    styleUrls: ['./style.scss'],
    template: `
                    <ion-card *ngIf="tag.preset?.type === 'select'">
                        <ion-card-header>
                        	<b *ngIf="!displayCode">{{tag.preset?.lbl}}</b>
                            <b *ngIf="displayCode">
                            <ion-icon name="code"></ion-icon>
                            {{tag.preset?.key}}</b>
                        </ion-card-header>

                        <ion-card-content>

                        <div class="wrapperEdit2cols">
                            <div class="contentEdit2cols">

                                    <ion-select *ngIf="!displayCode" [interface]="'popover'" [(ngModel)]="tag.value"
                                        style="width: 100%; min-width: 100%;padding-left:0;"
                                    >
                                        <ion-select-option  *ngFor ="let item of tag.preset.tags;" [value]="item.v" >
                                        {{item.lbl}}
                                        </ion-select-option>
                                    </ion-select>


                                <ion-item *ngIf="displayCode">
										<ion-input type="text" [(ngModel)]="tag.value" [placeholder]="tag.key"></ion-input>
									</ion-item>
                            </div>
                            <div class="buttonEdit2cols">
                                <ion-col width-10 class="ion-col10">
                                <ion-icon (click)="tag.value = ''" name="close" style="width: 2em; height: 2em;"></ion-icon>
                                </ion-col>
                            </div>
						</div>

                        </ion-card-content>
                    </ion-card>



                   <ion-card *ngIf="tag.preset?.type === 'list'">
                        <ion-card-header  (click)="emitOpenModal(tag)">
                            <b *ngIf="!displayCode">{{ tag.preset?.lbl }} 
                            <ion-icon name="settings"></ion-icon>
                            </b>
       
						    <b *ngIf="displayCode"> <ion-icon name="code"></ion-icon> {{ tag.preset?.key }}</b>
                        </ion-card-header>

                        <ion-card-content>

                        <div class="wrapperEdit2cols">
                            <div class="contentEdit2cols">
                                    <ion-item *ngIf="!displayCode && (tag | displayPresetLabel)" (click)="emitOpenModal(tag)">
                                        <p>{{ (tag | displayPresetLabel)?.lbl }} </p>
                                    </ion-item>

                                    <ion-item *ngIf="displayCode || !(tag | displayPresetLabel)" style="padding-left: 0px">
                                         <ion-label color="primary"> <ion-icon name="code"></ion-icon> </ion-label>
										<ion-input type="text" [(ngModel)]="tag.value" [placeholder]="tag.key"></ion-input>
                                    </ion-item>
                            </div>
                            <div class="buttonEdit2cols">
                                <ion-icon (click)="tag.value = ''" name="close" style="width: 2em; height: 2em;"></ion-icon>
						    </div>
						</div>

                        </ion-card-content>
                    </ion-card>



                    <ion-card *ngIf="tag.preset?.type === 'number'">
                        <ion-card-header>
                        	<b *ngIf="!displayCode">{{tag.preset?.lbl}}</b>
						    <b *ngIf="displayCode"> <ion-icon name="code"></ion-icon> {{tag.preset?.key}}</b>
                        </ion-card-header>

                        <ion-card-content>
                        <div class="wrapperEdit2cols">
                            <div class="contentEdit2cols">
                                	<ion-item style="padding-left: 0px">
										<ion-input type="number" [(ngModel)]="tag.value" [placeholder]="tag.key"></ion-input>
                                    </ion-item>
                            </div>


                            <div class="buttonEdit2cols">
                                <ion-icon (click)="tag.value = ''" name="close" style="width: 2em; height: 2em;"></ion-icon>
							</div>

					    </div>
                        </ion-card-content>
                    </ion-card>



                    <ion-card *ngIf="tag.preset?.type === 'text'">
                        <ion-card-header>
                            <b *ngIf="!displayCode">{{ tag.preset?.lbl }}</b>
                            <b *ngIf="displayCode"> <ion-icon name="code"></ion-icon> {{ tag.preset?.key }}</b>
                        </ion-card-header>

                        <ion-card-content>
                        <div class="wrapperEdit2cols">
                            <div class="contentEdit2cols">
                                	<ion-item style="padding-left: 0px">
										<ion-input type="text" [(ngModel)]="tag.value" [placeholder]="tag.key"></ion-input>
									</ion-item>
                            </div>
                            <div class="buttonEdit2cols">
                                <ion-icon (click)="tag.value = ''" name="close" style="width: 2em; height: 2em;"></ion-icon>
							</div>

						</div>
                        </ion-card-content>
                    </ion-card>
  `
})
export class EditPresets {
    @Input() displayCode;
    @Input() tag;

    @Output() openPrimaryListModal = new EventEmitter();

    emitOpenModal(tag) {
        if (!this.displayCode && this.tag.preset.type === 'list') {
            this.openPrimaryListModal.emit(tag);
        }
    }
}
