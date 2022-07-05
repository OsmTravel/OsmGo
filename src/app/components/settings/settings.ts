import { Component } from '@angular/core'
import { NavController, Platform, LoadingController } from '@ionic/angular'

import { ConfigService } from '@services/config.service'
import { MapService } from '@services/map.service'
import { OsmApiService } from '@services/osmApi.service'
import { TranslateService } from '@ngx-translate/core'
import { TagsService } from '@services/tags.service'
import { DataService } from '@services/data.service'
import { InitService } from '@services/init.service'

@Component({
    selector: 'page-settings',
    templateUrl: './settings.html',
    styleUrls: ['./settings.scss'],
})
export class SettingsPage {
    constructor(
        public navCtrl: NavController,
        public configService: ConfigService,
        public mapService: MapService,
        public platform: Platform,
        public tagsService: TagsService,
        public dataService: DataService,
        public osmApi: OsmApiService,
        public loadingController: LoadingController,
        public initService: InitService
    ) {}

    ngOnInit(): void {
        if (!this.initService.isLoaded) {
            // We need to instantiate the map
            this.navCtrl.back()
        }
    }

    back() {
        this.navCtrl.back()
    }

    mapMarginBufferChange(e) {
        this.configService.setMapMarginBuffer(e.detail.value)
    }

    limitFeaturesChange(e) {
        this.configService.setLimitFeatures(e.detail.value)
    }

    lockMapHeadingChange(e) {
        this.configService.setLockMapHeading(e.detail.checked)
    }

    followPositionChange(e) {
        this.configService.setFollowPosition(e.detail.checked)
    }

    centerWhenGpsIsReadyChange(e) {
        this.configService.setCenterWhenGpsIsReady(e.detail.checked)
    }

    defaultPrimarykeyWindowsChange(e) {
        this.configService.setDefaultPrimarykeyWindows(e.detail.value)
    }

    filterWayByArea(e) {
        this.configService.setFilterWayByArea(e.detail.checked)
        // value en m²!
        this.mapService.toogleMesureFilter(
            this.configService.getFilterWayByArea(),
            'way_fill',
            5000,
            this.mapService.map
        )
    }

    filterWayByLength(e) {
        this.configService.setFilterWayByLength(e.detail.checked)
        // value en km!
        this.mapService.toogleMesureFilter(
            this.configService.getFilterWayByLength(),
            'way_line',
            0.2,
            this.mapService.map
        )
    }

    displayOldTagIconChange(e) {
        this.configService.setOldTagsIcon(
            e.detail.checked,
            this.configService.config.oldTagsIcon.year
        )
        if (e.detail.checked) {
            this.mapService.showOldTagIcon(
                this.configService.config.oldTagsIcon.year
            )
        } else {
            this.mapService.hideOldTagIcon()
        }
        // this.mapService
    }

    yearOldTagIconChange(e) {
        this.configService.setOldTagsIcon(
            this.configService.config.oldTagsIcon.display,
            e.detail.value
        )
        if (this.configService.config.oldTagsIcon.display) {
            this.mapService.showOldTagIcon(e.detail.value)
        }
    }

    displayFixmeIconChange(e) {
        this.configService.setDisplayFixmeIcon(e.detail.checked)
        if (e.detail.checked) {
            this.mapService.showFixmeIcon()
        } else {
            this.mapService.hideFixmeIcon()
        }
    }

    addSurveyDateChange(e) {
        this.configService.setAddSurveyDate(e.detail.checked)
    }

    checkedKeyChange(e) {
        this.configService.setCheckedKey(e.detail.value)
    }

    languageUiChange(e) {
        const newLlang = e.detail.value
        this.configService.setUiLanguage(newLlang)
    }

    languageTagsChange(e) {
        const newLlang = e.detail.value
        this.configService.setLanguageTags(newLlang)
    }

    countryTagsChange(e) {
        const newCountry = e.detail.value
        this.configService.setCountryTags(newCountry)
    }

    isSelectableLineChange(e) {
        this.configService.setIsSelectableLine(e.detail.checked)
    }
    isSelectablePolygonChange(e) {
        this.configService.setIsSelectablePolygon(e.detail.checked)
    }

    async deleteCache() {
        await this.dataService.clearCache()
        const cachesKeys = await caches.keys()
        for (let key of cachesKeys) {
            await caches.delete(key)
        }

        const mainLocation = `${window.location.origin}#/main`
        window.location.replace(mainLocation)
        window.location.reload()
    }

    async changeIsDevServer(isDev: boolean) {
        await this.configService.setIsDevServer(isDev)
        const mainLocation = `${window.location.origin}#/main`
        window.location.replace(mainLocation)
        window.location.reload()
    }

    async disableDevMode(e) {
        const isDevServer = this.configService.getIsDevServer()
        this.configService.setIsDevMode(false)
        if (isDevServer) {
            await this.changeIsDevServer(false)
        }
    }
}
