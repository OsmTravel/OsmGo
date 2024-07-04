import { Component, Output, EventEmitter, Input, NgZone } from '@angular/core'
import { AlertController, Platform, NavController } from '@ionic/angular'
import { AboutPage } from '@components/about/about'
import { PushDataToOsmPage } from '@components/pushDataToOsm/pushDataToOsm'

import { MapService } from '@services/map.service'
import { OsmApiService } from '@services/osmApi.service'
import { DataService } from '@services/data.service'
import { ConfigService } from '@services/config.service'
import { AlertService } from '@services/alert.service'
import { TranslateService } from '@ngx-translate/core'
import { menuAnimations } from './menu.animations'
import { concat } from 'rxjs'
import { OsmAuthService } from '@app/services/osm-auth.service'

@Component({
    selector: 'menu-component',
    templateUrl: './menu.html',
    styleUrls: ['./menu.scss'],
    animations: menuAnimations,
})
export class MenuPage {
    @Output() closeEvent = new EventEmitter()
    @Output() exitApp = new EventEmitter()
    @Input() menuIsOpen
    @Input() newVersion
    aboutPage = AboutPage
    pushDataToOsmPage = PushDataToOsmPage

    constructor(
        public mapService: MapService,
        public osmApi: OsmApiService,
        public dataService: DataService,
        public configService: ConfigService,
        public alertService: AlertService,
        private alertCtrl: AlertController,
        public platform: Platform,
        private translate: TranslateService,
        private navCtrl: NavController,
        private osmAuthService: OsmAuthService
    ) {}

    deleteDatapresentConfirm() {
        this.alertCtrl
            .create({
                header: this.translate.instant(
                    'MENU.DELETE_DATA_CONFIRM_HEADER'
                ),
                message: this.translate.instant(
                    'MENU.DELETE_DATA_CONFIRM_MESSAGE'
                ),
                buttons: [
                    {
                        text: this.translate.instant('SHARED.CANCEL'),
                        role: 'cancel',
                        handler: () => {},
                    },
                    {
                        text: this.translate.instant('SHARED.CONFIRM'),
                        handler: () => {
                            this.mapService.resetDataMap()
                            this.closeMenu()
                        },
                    },
                ],
            })
            .then((alert) => {
                alert.present()
            })
    }

    pushPage(path) {
        this.navCtrl.navigateForward(path)
    }

    openBaseMapsPage() {
        const centerOfMap = this.mapService.map.getCenter()
        const lng = centerOfMap.lng
        const lat = centerOfMap.lat
        this.pushPage(`/basemaps/${lng}/${lat}`)
    }

    closeMenu() {
        this.closeEvent.emit()
    }

    logout() {
        this.osmAuthService.logout()
    }

    login() {
        this.osmAuthService.login()
    }

    swipe(e) {
        this.closeMenu()
    }

    reloadApp() {
        window.location.reload()
    }

    exit() {
        this.exitApp.emit()
    }
}
