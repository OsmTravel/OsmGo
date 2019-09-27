import { Component, Input } from '@angular/core';
import * as moment from 'moment';
import { ConfigService } from 'src/app/services/config.service';
@Component({
    selector: 'read-meta',
	templateUrl: './READ_Meta.component.html',
})
export class ReadMeta {

	constructor( private configService: ConfigService){

	}
	
	ngOnInit(): void {
		moment.locale(this.configService.getUiLanguage()); // TODO Once...
	}

    @Input() meta;
	@Input() displayCode;
	@Input() usedByWays;
	
}
