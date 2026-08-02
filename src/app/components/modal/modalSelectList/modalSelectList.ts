import {
    ChangeDetectionStrategy,
    Component,
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
    Platform,
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
    readonly data = input.required<ModalSelectListData>()
    readonly searchText = signal('')
    initvalue: string
    language: string
    countryCode: string
    constructor(
        public modalCtrl: ModalController,
        public platform: Platform,
        public configService: ConfigService
    ) {
        this.language = this.configService.config.languageTags
        this.countryCode = this.configService.config.countryTags

        // this.platform.registerBackButtonAction(e => {
        //     this.dismiss();
        // });
    }

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
