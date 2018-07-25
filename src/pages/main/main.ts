import { Component } from '@angular/core';
import { NavController, ModalController, ToastController, Platform, AlertController } from 'ionic-angular';

import { MenuController } from 'ionic-angular';


import { OsmApiService } from '../../services/osmApi.service';
import { TagsService } from '../../services/tags.service';
import { MapService } from '../../services/map.service';
import { DataService } from '../../services/data.service';
import { LocationService } from '../../services/location.service';
import { RouterService } from '../../services/router.service';
import { AlertService } from '../../services/alert.service';
import { ConfigService } from '../../services/config.service';
import { ModalsContentPage } from '../modal/modal';
import { BBox } from '@turf/turf';


@Component({
  templateUrl: 'main.html',
  selector: 'main',
})

export class MainPage {

  constructor(public navCtrl: NavController, public modalCtrl: ModalController, public toastCtrl: ToastController, public menuCtrl: MenuController,
    public osmApi: OsmApiService,
    public tagsService: TagsService,
    public mapService: MapService,
    public dataService: DataService,
    public routerService: RouterService,
    public locationService: LocationService,
    public alertService: AlertService,
    public configService: ConfigService,
    public platform: Platform,
    private alertCtrl: AlertController
  ) {
    // backButton
    this.platform.registerBackButtonAction(e => {
      this.presentConfirm();
    });

    mapService.eventShowModal.subscribe(data => {
      let newPosition = (data.newPosition) ? data.newPosition : false;
      let modal = this.modalCtrl.create(ModalsContentPage, { type: data.type, data: data.geojson, newPosition: newPosition, origineData: data.origineData });
      modal.onDidDismiss(data => {
        if (data) {
          if (data.type === 'Move') {
            this.mapService.eventMoveElement.emit(data);
          }
          if (data.redraw) {
            setTimeout(() => {
              this.mapService.eventMarkerReDraw.emit(this.dataService.getGeojson());
              this.mapService.eventMarkerChangedReDraw.emit(this.dataService.getGeojsonChanged());
            }, 100);

          }
        }
      });
      modal.present();
    });


    this.alertService.eventNewAlert.subscribe(alert => {
      this.presentToast(alert);
    })


  }


  presentConfirm() {
    let alert = this.alertCtrl.create({
      title: 'Vraiment?',
      message: 'Voulez vous vraiment quitter Osm Go! ?',
      buttons: [
        {
          text: 'Non',
          role: 'cancel',
          handler: () => {

          }
        },
        {
          text: 'Oui',
          handler: () => {
            this.platform.exitApp();
          }
        }
      ]
    });
    alert.present();
  }

  loadData() {
    // L'utilisateur charge les données, on supprime donc le tooltip
    this.alertService.displayToolTipRefreshData = false;
    this.mapService.loadingData = true;
    let bbox: BBox = this.mapService.getBbox()
    this.osmApi.getDataFromBbox(bbox, false)
      .subscribe(data => { // data = geojson a partir du serveur osm

      },
        err => {
          this.mapService.loadingData = false;
          this.presentToast(err);
        });
  }



  goToPage(pageName) {
    this.routerService.pushPage(pageName)

  }
  goToPushDataPage() {
    if (this.osmApi.getUserInfo().connected) {
      this.goToPage('pushDataToOsmPage');
    } else {
      this.goToPage('loginPage');
    }
  }



  presentToast(message) {
    let toast = this.toastCtrl.create({
      message: message,
      duration: 5000,
      showCloseButton: true,
      closeButtonText: 'X'
    });
    toast.present();
  }

  ngAfterViewInit() {
    this.tagsService.loadTags();
    this.mapService.eventDomMainReady.emit(document.getElementById('map'));
    let that = this;
    this.alertService.eventDisplayToolTipRefreshData.subscribe(e => {
      // On affiche le Tootltip "Télécharger les données de la zone" pour 10 sec
      that.alertService.displayToolTipRefreshData = true;
      setTimeout(function () {
        that.alertService.displayToolTipRefreshData = false;

      }, 10000);
    })
  }
}
