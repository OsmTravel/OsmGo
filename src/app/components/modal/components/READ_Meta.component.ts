import { Component, Input } from '@angular/core';
import * as moment from 'moment';
import { ConfigService } from 'src/app/services/config.service';
@Component({
    selector: 'read-meta',
    template: `
  	<ion-card  color="primary">
		<ion-card-content>
		{{ 'MODAL_SELECTED_ITEM.META_VERSION' | translate}} {{meta?.version}} <br>
			<span *ngIf="meta.timestamp === 0">
			{{ 'MODAL_SELECTED_ITEM.META_BEING_CREATED' | translate}}
			</span>
	
			<span *ngIf="displayCode && meta.timestamp !== 0 ">
			{{meta?.version > 1 ? 
					('MODAL_SELECTED_ITEM.META_UPDATED_AT_DATE' | translate) : 
					('MODAL_SELECTED_ITEM.META_CREATED_AT_DATE' | translate)}}
				{{ meta.timestamp | date:'dd/MM/yyyy HH:mm'}}
			</span>
			<span *ngIf="!displayCode && meta.timestamp !== 0" >
			{{meta?.version > 1 ? 
				('MODAL_SELECTED_ITEM.META_UPDATED_AT_DATE_TIME_AGO' | translate) : 
				('MODAL_SELECTED_ITEM.META_CREATED_AT_DATE_TIME_AGO' | translate)}}

			 {{  meta.timestamp | amTimeAgo}}
			</span>
			<br> {{ 'MODAL_SELECTED_ITEM.META_BY' | translate}} {{meta?.user ? meta?.user : ('MODAL_SELECTED_ITEM.META_MYSELF' | translate) }}
		</ion-card-content>
	</ion-card>
  `
})
export class ReadMeta {

	constructor( private configService: ConfigService){

	}
	
	ngOnInit(): void {
		moment.locale(this.configService.getUiLanguage()); // TODO Once...
	}

    @Input() meta;
    @Input() displayCode;
}
