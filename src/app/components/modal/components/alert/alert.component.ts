import {
    ChangeDetectionStrategy,
    Component,
    Input,
    input,
    OnInit,
    output,
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
    // TODO: Skipped for migration because:
    //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
    //  and migrating would break narrowing currently.
    @Input() tagConfig
    // TODO: Skipped for migration because:
    //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
    //  and migrating would break narrowing currently.
    @Input() language
    readonly countryCode = input(undefined)
    readonly fixDeprecated = output<{ old: unknown; replace: unknown }>()

    constructor() {}

    ngOnInit() {}
}
