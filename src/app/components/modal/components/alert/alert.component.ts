import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core'
import {
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
} from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import { TagConfig } from '@osmgo/type'

interface AlertTagConfig extends TagConfig {
    alert?: Record<string, string>
    deprecated?: boolean
    replace?: unknown
    warning?: Record<string, string>
    warningCountryCodes?: string[]
}

@Component({
    selector: 'app-alert',
    templateUrl: './alert.component.html',
    styleUrls: ['./alert.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [IonButton, IonCard, IonCardContent, IonIcon, TranslateModule],
})
export class AlertComponent {
    readonly tagConfig = input<AlertTagConfig>()
    readonly language = input('en')
    readonly countryCode = input(undefined)
    readonly fixDeprecated = output<{ old: unknown; replace: unknown }>()
}
