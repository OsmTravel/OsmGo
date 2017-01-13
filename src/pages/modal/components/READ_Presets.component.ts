import { Component, Input } from '@angular/core';

@Component({
    selector: 'read-presets',
    template: `
   	    <ion-card>
				<ion-card-header>
					<b *ngIf="!displayCode">{{currentPresets[tag.key]?.lbl}}</b>
					<b *ngIf="displayCode">{{tag.key}}</b>
				</ion-card-header>
				<ion-card-content>
                    <p *ngIf="!displayCode && findCurrentConfigPresset(tag)">{{findCurrentConfigPresset(tag).lbl}}</p>
                    <p *ngIf="displayCode || !findCurrentConfigPresset(tag)">
                        <i *ngIf="currentPresets[tag.key]?.type !== 'number' && currentPresets[tag.key]?.type !== 'text' " class="fa fa-code" aria-hidden="true"></i>
                         {{tag.value}}
                    </p>
             
				</ion-card-content>
			</ion-card>
  `
})
export class ReadPresets {
    @Input() displayCode;
    @Input() currentPresets;
    @Input() tag;

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