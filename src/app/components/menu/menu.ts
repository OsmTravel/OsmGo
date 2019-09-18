import { Component, Output, EventEmitter, Input} from '@angular/core';
import {  AlertController, Platform, NavController } from '@ionic/angular';
import { AboutPage } from '../about/about';
import { PushDataToOsmPage } from '../pushDataToOsm/pushDataToOsm';

import { MapService } from '../../services/map.service';
import { OsmApiService } from '../../services/osmApi.service';
import { DataService } from '../../services/data.service';
import { ConfigService } from '../../services/config.service';
import { AlertService } from '../../services/alert.service';
import { TranslateService } from '@ngx-translate/core';
import { menuAnimations } from './menu.animations';

@Component({
    selector: 'menu-component',
    templateUrl: './menu.html',
    styleUrls: ['./menu.scss'],
    animations: menuAnimations
})
export class MenuPage {

    @Output() closeEvent = new EventEmitter();
    @Input() menuIsOpen;
    aboutPage = AboutPage;
    pushDataToOsmPage = PushDataToOsmPage;

    constructor(
        public mapService: MapService,
        public osmApi: OsmApiService,
        public dataService: DataService,
        public configService: ConfigService,
        public alertService: AlertService,
        private alertCtrl: AlertController,
        public platform: Platform,
        private translate: TranslateService,
        private navCtrl: NavController
    ) {


    }


    deleteDatapresentConfirm() {
        this.alertCtrl.create({
            header: this.translate.instant('MENU.DELETE_DATA_CONFIRM_HEADER'), 
            message: this.translate.instant('MENU.DELETE_DATA_CONFIRM_MESSAGE'),
            buttons: [
                {
                    text: this.translate.instant('SHARED.CANCEL'),
                    role: 'cancel',
                    handler: () => {

                    }
                },
                {
                    text: this.translate.instant('SHARED.CONFIRM'),
                    handler: () => {
                        this.mapService.resetDataMap();
                        this.closeMenu();
                    }
                }
            ]
        })
        .then(alert => {
            alert.present();
        })
        ;

    }

    exit() {
        window.navigator['app'].exitApp();
    }
    pushPage(path) {
        this.navCtrl.navigateForward(path);
        // this.routerService.pushPage(pageName);
    }
    setRootPage(pageName) {
        // this.routerService.setRootPage(pageName);

    }

    closeMenu() {
        this.closeEvent.emit()
    }

    logout() {
        this.configService.setIsDelayed(true);
        this.osmApi.resetUserInfo();
    }

    swipe(e){
        this.closeMenu() 
    }
}
