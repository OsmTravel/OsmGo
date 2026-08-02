import {
    ChangeDetectionStrategy,
    Component,
    inject,
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
    readonly modalCtrl = inject(ModalController)
    readonly tagsService = inject(TagsService)
    readonly configService = inject(ConfigService)
    readonly translate = inject(TranslateService)

    readonly moreFields = input<string[]>([])
    readonly usedList = input<string[]>([])

    readonly language = this.configService.config().languageTags
    readonly countryCode = this.configService.config().countryTags

    readonly presets: Array<Preset> = Object.values(this.tagsService.presets)
    readonly searchFilter = signal('')

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
