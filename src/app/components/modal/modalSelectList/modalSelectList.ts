import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    OnInit,
    signal,
} from '@angular/core'
import {
    IonButton,
    IonFooter,
    IonItem,
    IonLabel,
    IonList,
    IonRadio,
    IonRadioGroup,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    ModalController,
} from '@ionic/angular/standalone'
import type { SearchbarInputEventDetail } from '@ionic/core'
import { TranslateModule } from '@ngx-translate/core'
import { Preset } from '@osmgo/type'
import { FilterByCountryCode } from '@pipes/filterByCountryCode.pipe'
import { FilterByPresetsContentPipe } from '@pipes/filterByPresetsContent.pipe'
import { ConfigService } from '@services/config.service'

interface ModalSelectListData {
    key: string
    preset: Preset
    value: string
}

@Component({
    templateUrl: './modalSelectList.html',
    styleUrls: ['./modalSelectList.scss'],
    selector: 'modal-select-list',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        FilterByCountryCode,
        FilterByPresetsContentPipe,
        IonButton,
        IonFooter,
        IonItem,
        IonLabel,
        IonList,
        IonRadio,
        IonRadioGroup,
        IonSearchbar,
        IonTitle,
        IonToolbar,
        TranslateModule,
    ],
})
export class ModalSelectList implements OnInit {
    readonly modalCtrl = inject(ModalController)
    readonly configService = inject(ConfigService)

    readonly data = input.required<ModalSelectListData>()
    readonly searchText = signal('')
    initvalue: string
    readonly language = this.configService.config.languageTags
    readonly countryCode = this.configService.config.countryTags

    ngOnInit(): void {
        this.initvalue = this.data().value
    }

    onSearchInput(event: CustomEvent<SearchbarInputEventDetail>): void {
        this.searchText.set(event.detail.value ?? '')
    }

    dismiss(data = null) {
        this.modalCtrl.dismiss(data)
    }

    selected(e) {
        if (e && e.detail && this.initvalue !== e.detail) {
            this.dismiss({
                key: this.data().key,
                value: e.detail.value.v,
                tags: e.detail.value.tags,
            })
        }
    }
}
