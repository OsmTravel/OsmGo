import { Component, Input } from '@angular/core';
import { MenuController, AlertController, Platform } from 'ionic-angular';
import { AboutPage } from '../about/about';
import { PushDataToOsmPage } from '../pushDataToOsm/pushDataToOsm';
import { RouterService } from '../../services/router.service'
import { MapService } from '../../services/map.service'
import { OsmApiService } from '../../services/osmApi.service';
import { DataService } from '../../services/data.service';
import { ConfigService } from '../../services/config.service';
import { AlertService } from '../../services/alert.service';


@Component({
    selector: 'menu-content',
    templateUrl: './menu.html'
})
export class MenuPage {

    @Input() content;
    aboutPage = AboutPage;
    pushDataToOsmPage = PushDataToOsmPage;

    constructor(public routerService: RouterService, public menuCtrl: MenuController,
        public mapService: MapService,
        public osmApi: OsmApiService,
        public dataService: DataService,
        public configService : ConfigService,
        public alertService: AlertService,
        private alertCtrl: AlertController,
        public platform: Platform
    ) {


    }

      deleteDatapresentConfirm() {
    let alert = this.alertCtrl.create({
      title: 'Vraiment?',
      message: 'Supprimer les données téléchargées? (conserve les modifications)',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          handler: () => {

          }
        },
        {
          text: 'Confirmer',
          handler: () => {
            this.mapService.resetDataMap()
          }
        }
      ]
    });
    alert.present();
  }

  exit(){
      this.platform.exitApp();
  }
    pushPage(pageName) {
        this.routerService.pushPage(pageName)
    }
    setRootPage(pageName) {
        this.routerService.setRootPage(pageName)

    }

    closeMenu() {
        this.menuCtrl.close();
    }

    logout(){
        this.configService.setIsDelayed(true);
        this.osmApi.resetUserInfo();
        this.pushPage('loginPage')
    }
 
}