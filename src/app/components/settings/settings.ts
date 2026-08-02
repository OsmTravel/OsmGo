import { Component, inject } from '@angular/core'
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemDivider,
    IonItemGroup,
    IonLabel,
    IonRange,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToggle,
    IonToolbar,
    LoadingController,
    NavController,
    Platform,
    type RangeCustomEvent,
    type SelectCustomEvent,
    type ToggleCustomEvent,
} from '@ionic/angular/standalone'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { InitService } from '@services/init.service'
import { MapService } from '@services/map.service'
import { OsmApiService } from '@services/osmApi.service'
import { TagsService } from '@services/tags.service'

@Component({
    selector: 'page-settings',
    templateUrl: './settings.html',
    styleUrls: ['./settings.scss'],
    imports: [
        IonButton,
        IonButtons,
        IonContent,
        IonHeader,
        IonIcon,
        IonItem,
        IonItemDivider,
        IonItemGroup,
        IonLabel,
        IonRange,
        IonSelect,
        IonSelectOption,
        IonTitle,
        IonToggle,
        IonToolbar,
        TranslateModule,
    ],
})
export class SettingsPage {
    readonly navCtrl = inject(NavController)
    readonly configService = inject(ConfigService)
    readonly mapService = inject(MapService)
    readonly platform = inject(Platform)
    readonly tagsService = inject(TagsService)
    readonly dataService = inject(DataService)
    readonly osmApi = inject(OsmApiService)
    readonly loadingController = inject(LoadingController)
    readonly initService = inject(InitService)
    private readonly translate = inject(TranslateService)

    ngOnInit(): void {
        if (!this.initService.isLoaded) {
            // We need to instantiate the map
            this.navCtrl.back()
        }
    }

    back(): void {
        this.navCtrl.back()
    }

    mapMarginBufferChange(event: RangeCustomEvent): void {
        this.configService.setMapMarginBuffer(this.getRangeValue(event))
    }

    limitFeaturesChange(event: RangeCustomEvent): void {
        this.configService.setLimitFeatures(this.getRangeValue(event))
    }

    lockMapHeadingChange(event: ToggleCustomEvent): void {
        this.configService.setLockMapHeading(event.detail.checked)
    }

    followPositionChange(event: ToggleCustomEvent): void {
        this.configService.setFollowPosition(event.detail.checked)
    }

    centerWhenGpsIsReadyChange(event: ToggleCustomEvent): void {
        this.configService.setCenterWhenGpsIsReady(event.detail.checked)
    }

    defaultPrimarykeyWindowsChange(
        event: SelectCustomEvent<'lastTags' | 'bookmarks'>
    ): void {
        this.configService.setDefaultPrimarykeyWindows(event.detail.value)
    }

    filterWayByArea(event: ToggleCustomEvent): void {
        this.configService.setFilterWayByArea(event.detail.checked)
        // value en m²!
        this.mapService.toogleMesureFilter(
            this.configService.getFilterWayByArea(),
            'way_fill',
            5000,
            this.mapService.map
        )
    }

    filterWayByLength(event: ToggleCustomEvent): void {
        this.configService.setFilterWayByLength(event.detail.checked)
        // value en km!
        this.mapService.toogleMesureFilter(
            this.configService.getFilterWayByLength(),
            'way_line',
            0.2,
            this.mapService.map
        )
    }

    displayOldTagIconChange(event: ToggleCustomEvent): void {
        this.configService.setOldTagsIcon(
            event.detail.checked,
            this.configService.config().oldTagsIcon.year
        )
        if (event.detail.checked) {
            this.mapService.showOldTagIcon(
                this.configService.config().oldTagsIcon.year
            )
        } else {
            this.mapService.hideOldTagIcon()
        }
        // this.mapService
    }

    yearOldTagIconChange(event: RangeCustomEvent): void {
        const year = this.getRangeValue(event)
        this.configService.setOldTagsIcon(
            this.configService.config().oldTagsIcon.display,
            year
        )
        if (this.configService.config().oldTagsIcon.display) {
            this.mapService.showOldTagIcon(year)
        }
    }

    displayFixmeIconChange(event: ToggleCustomEvent): void {
        this.configService.setDisplayFixmeIcon(event.detail.checked)
        if (event.detail.checked) {
            this.mapService.showFixmeIcon()
        } else {
            this.mapService.hideFixmeIcon()
        }
    }

    addSurveyDateChange(event: ToggleCustomEvent): void {
        this.configService.setAddSurveyDate(event.detail.checked)
    }

    checkedKeyChange(
        event: SelectCustomEvent<'survey:date' | 'check_date'>
    ): void {
        this.configService.setCheckedKey(event.detail.value)
    }

    displaySurveyCardChange(
        event: SelectCustomEvent<'never' | 'when_older' | 'always'>
    ): void {
        this.configService.setDisplaySurveyCard(event.detail.value)
    }

    displaySurveyCardOptions() {
        return {
            header: this.translate.instant('SETTINGS.DISPLAY_SURVEY_CARD'),
            subHeader: this.translate.instant(
                'SETTINGS.DISPLAY_SURVEY_CARD_HINT'
            ),
        }
    }

    yearOldSurveyCardChange(event: RangeCustomEvent): void {
        this.configService.setSurveyCardYear(this.getRangeValue(event))
    }

    languageUiChange(event: SelectCustomEvent<string>): void {
        this.configService.setUiLanguage(event.detail.value)
    }

    languageTagsChange(event: SelectCustomEvent<string>): void {
        this.configService.setLanguageTags(event.detail.value)
    }

    countryTagsChange(event: SelectCustomEvent<string>): void {
        this.configService.setCountryTags(event.detail.value)
    }

    countryTagsOptions() {
        return {
            header: this.translate.instant('SETTINGS.TAG_COUNTRY'),
            subHeader: this.translate.instant('SETTINGS.TAG_COUNTRY_HINT'),
        }
    }

    isSelectableLineChange(event: ToggleCustomEvent): void {
        this.configService.setIsSelectableLine(event.detail.checked)
    }
    isSelectablePolygonChange(event: ToggleCustomEvent): void {
        this.configService.setIsSelectablePolygon(event.detail.checked)
    }

    async deleteCache(): Promise<void> {
        await this.dataService.clearCache()
        const cachesKeys = await caches.keys()
        for (const key of cachesKeys) {
            await caches.delete(key)
        }

        const mainLocation = `${window.location.origin}#/main`
        window.location.replace(mainLocation)
        window.location.reload()
    }

    async changeIsDevServer(isDev: boolean): Promise<void> {
        await this.configService.setIsDevServer(isDev)
        const mainLocation = `${window.location.origin}#/main`
        window.location.replace(mainLocation)
        window.location.reload()
    }

    private getRangeValue(event: RangeCustomEvent): number {
        const value = event.detail.value
        return typeof value === 'number' ? value : value.lower
    }
}
