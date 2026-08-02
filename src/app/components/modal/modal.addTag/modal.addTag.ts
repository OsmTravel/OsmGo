import {
    ChangeDetectionStrategy,
    Component,
    input,
    signal,
} from '@angular/core'
import {
    IonButton,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonItemGroup,
    IonLabel,
    ModalController,
} from '@ionic/angular/standalone'
import type { InputInputEventDetail } from '@ionic/core'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { Preset } from '@osmgo/type'
import { nameToOsmKey } from '@osmgo/utils'
import { FilterByListPipe } from '@pipes/filterByList.pipe'
import { FilterPresetsByListPipe } from '@pipes/filterPresetsByList.pipe'
import { RemoveBrandsPipe } from '@pipes/removeBrands.pipe'
import { SearchForPipe } from '@pipes/searchFor.pipe'
import { ToOsmTagPipe } from '@pipes/toOsmTag.pipe'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'

@Component({
    selector: 'modal-add-tag',
    templateUrl: './modal.addTag.html',
    styleUrls: ['./modal.addTag.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        FilterByListPipe,
        FilterPresetsByListPipe,
        IonButton,
        IonContent,
        IonFooter,
        IonHeader,
        IonIcon,
        IonInput,
        IonItem,
        IonItemGroup,
        IonLabel,
        RemoveBrandsPipe,
        SearchForPipe,
        ToOsmTagPipe,
        TranslateModule,
    ],
})
export class ModalAddTag {
    readonly moreFields = input<string[]>([])
    readonly usedList = input<string[]>([])

    language: string
    countryCode: string

    presets: Array<Preset>
    readonly searchFilter = signal('')

    constructor(
        public modalCtrl: ModalController,
        public tagsService: TagsService,
        public configService: ConfigService,
        public translate: TranslateService
    ) {
        this.language = this.configService.config.languageTags
        this.countryCode = this.configService.config.countryTags

        this.presets = Object.values(tagsService.presets)
    }

    onSearchInput(event: CustomEvent<InputInputEventDetail>): void {
        this.searchFilter.set(event.detail.value ?? '')
    }

    dismiss(data = null) {
        this.modalCtrl.dismiss(data)
    }

    select(key) {
        this.dismiss(nameToOsmKey(key))
    }

    nameToOsmKey(name) {
        return nameToOsmKey(name)
    }
}
