import { LowerCasePipe } from '@angular/common'
import { Component, inject, input, OnInit, signal } from '@angular/core'
import { TagListElementComponent } from '@components/tag-list-element/tag-list-element.component'
import {
    IonButton,
    IonChip,
    IonContent,
    IonFooter,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSearchbar,
    IonTitle,
    ModalController,
} from '@ionic/angular/standalone'
import type { SearchbarInputEventDetail } from '@ionic/core'
import { TranslateModule } from '@ngx-translate/core'
import { TagConfig } from '@osmgo/type'
import { FilterByByGeometryTypePipe } from '@pipes/filter-by-geometry-type.pipe'
import { FilterBySearchablePipe } from '@pipes/filter-by-searchable.pipe'
import { FilterByTagsContentPipe } from '@pipes/filterByTagsContent.pipe'
import { FilterDeprecatedTagPipe } from '@pipes/filterDeprecatedTag.pipe'
import { FilterExcludeTagByCountryCode } from '@pipes/filterExcludeTagByCountryCode.pipe'
import { FiltersTagsByIdsPipe } from '@pipes/filters-tags-by-ids.pipe'
import { LimitDisplayTagsPipe } from '@pipes/limit-display-tags.pipe'
import { SortArrayPipe } from '@pipes/sort-array.pipe'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'

@Component({
    selector: 'modal-primary-tag',
    templateUrl: './modal.primaryTag.html',
    styleUrls: ['./modal.primaryTag.scss'],
    imports: [
        FilterByByGeometryTypePipe,
        FilterBySearchablePipe,
        FilterByTagsContentPipe,
        FilterDeprecatedTagPipe,
        FilterExcludeTagByCountryCode,
        FiltersTagsByIdsPipe,
        IonButton,
        IonChip,
        IonContent,
        IonFooter,
        IonIcon,
        IonItem,
        IonLabel,
        IonList,
        IonSearchbar,
        IonTitle,
        LimitDisplayTagsPipe,
        LowerCasePipe,
        SortArrayPipe,
        TagListElementComponent,
        TranslateModule,
    ],
})
export class ModalPrimaryTag implements OnInit {
    readonly modalCtrl = inject(ModalController)
    readonly tagsService = inject(TagsService)
    readonly configService = inject(ConfigService)

    private swipeStartX: number | null = null

    selectedKey: string
    tagsOfselectedKey
    loading = true
    allTags: TagConfig[]
    readonly searchText = signal('')
    currentListOfTags: TagConfig[] = []
    typeFiche = 'list'
    customValue = ''
    oldTagConfig: TagConfig
    geometriesPossible: string[] = []
    geometryType: 'point' | 'vertex' | 'line' | 'area'
    displayType = 'lastTags'
    countryTags
    readonly tagConfigInput = input.required<TagConfig>({ alias: 'tagConfig' })
    readonly geometryTypeInput = input.required<
        'point' | 'vertex' | 'line' | 'area'
    >({ alias: 'geometryType' })

    ngOnInit() {
        this.displayType =
            this.configService.config().defaultPrimarykeyWindows == 'bookmarks'
                ? 'bookmarks'
                : 'lastTags'
        this.oldTagConfig = this.tagConfigInput()
        this.geometryType = this.geometryTypeInput()
        this.currentListOfTags = this.tagsService.tags()
        this.loading = false
    }

    onSearchInput(event: CustomEvent<SearchbarInputEventDetail>): void {
        this.searchText.set(event.detail.value ?? '')
    }

    dismiss(data = null) {
        this.modalCtrl.dismiss(data)
    }

    summit(data) {
        this.dismiss(data)
    }
    cancel() {
        this.dismiss()
    }

    selected(config) {
        this.summit(config)
    }

    addBookmark(tag: TagConfig) {
        this.tagsService.addBookMark(tag)
    }
    removeBookmark(tag: TagConfig) {
        this.tagsService.removeBookMark(tag)
    }

    addCustomValue(key, value) {
        // TODO: ckeck if aleardy exist
        const newConfig: TagConfig = {
            icon: 'maki-circle-custom',
            markerColor: '#000000',
            geometry: ['point', 'vertex', 'line', 'area'],
            lbl: { en: `${key} = ${value}` },
            presets: [],
            id: `${key}/${value}`,
            key: value,
            tags: {},
            isUserTag: true,
        }
        newConfig.tags[key] = value

        this.tagsService.addUserTags(newConfig)

        this.summit(newConfig)
    }

    startSwipe(event: PointerEvent): void {
        this.swipeStartX = event.clientX
    }

    endSwipe(event: PointerEvent): void {
        if (this.swipeStartX === null) {
            return
        }

        const distance = event.clientX - this.swipeStartX
        if (distance < -50) {
            this.displayType = 'bookmarks'
        } else if (distance > 50) {
            this.displayType = 'lastTags'
        }
        this.swipeStartX = null
    }

    cancelSwipe(): void {
        this.swipeStartX = null
    }

    changePageLastTagsBookmarks(value) {
        this.displayType = value
        this.configService.setDefaultPrimarykeyWindows(value)
    }
}
