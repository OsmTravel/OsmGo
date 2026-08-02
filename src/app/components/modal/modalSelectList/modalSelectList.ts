import { Component, inject, input, OnInit, signal } from '@angular/core'
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
    type RadioGroupCustomEvent,
} from '@ionic/angular/standalone'
import type { SearchbarInputEventDetail } from '@ionic/core'
import { TranslateModule } from '@ngx-translate/core'
import type { Preset, PresetOption } from '@osmgo/type'
import { FilterByCountryCode } from '@pipes/filterByCountryCode.pipe'
import { FilterByPresetsContentPipe } from '@pipes/filterByPresetsContent.pipe'
import { ConfigService } from '@services/config.service'

interface ModalSelectListData {
    key: string
    preset: Preset
    value: string
}

interface SelectablePresetOption extends PresetOption {
    tags?: Record<string, string>
}

interface ModalSelectListResult {
    key: string
    value: string
    tags?: Record<string, string>
}

@Component({
    templateUrl: './modalSelectList.html',
    styleUrls: ['./modalSelectList.scss'],
    selector: 'modal-select-list',
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
    initialValue = ''
    readonly language = this.configService.config().languageTags
    readonly countryCode = this.configService.config().countryTags

    ngOnInit(): void {
        this.initialValue = this.data().value
    }

    onSearchInput(event: CustomEvent<SearchbarInputEventDetail>): void {
        this.searchText.set(event.detail.value ?? '')
    }

    dismiss(data: ModalSelectListResult | null = null): void {
        void this.modalCtrl.dismiss(data)
    }

    selected(event: RadioGroupCustomEvent<SelectablePresetOption>): void {
        const option = event.detail.value
        if (option && this.initialValue !== option.v) {
            this.dismiss({
                key: this.data().key,
                value: option.v,
                tags: option.tags,
            })
        }
    }
}
