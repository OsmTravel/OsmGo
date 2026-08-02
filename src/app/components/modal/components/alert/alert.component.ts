import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
} from '@angular/core'
import {
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
} from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'

@Component({
    selector: 'app-alert',
    templateUrl: './alert.component.html',
    styleUrls: ['./alert.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [IonButton, IonCard, IonCardContent, IonIcon, TranslateModule],
})
export class AlertComponent implements OnInit {
    @Input() tagConfig
    @Input() language
    @Input() countryCode
    @Output() fixDeprecated = new EventEmitter()

    constructor() {}

    ngOnInit() {}
}
