import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
} from '@angular/core'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'

@Component({
    selector: 'app-alert',
    templateUrl: './alert.component.html',
    styleUrls: ['./alert.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [IonicModule, TranslateModule],
})
export class AlertComponent implements OnInit {
    @Input() tagConfig
    @Input() language
    @Input() countryCode
    @Output() fixDeprecated = new EventEmitter()

    constructor() {}

    ngOnInit() {}
}
