import { Component, NgZone } from '@angular/core';
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

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/timer';
@Component({
  templateUrl: 'main.html',
  selector: 'main',
})

export class MainPage {

  constructor(public navCtrl: NavController, public modalCtrl: ModalController, public toastCtrl: ToastController,
    public menuCtrl: MenuController,
    public osmApi: OsmApiService,
    public tagsService: TagsService,
    public mapService: MapService,
    public dataService: DataService,
    public routerService: RouterService,
    public locationService: LocationService,
    public alertService: AlertService,
    public configService: ConfigService,
    public platform: Platform,
    private alertCtrl: AlertController,
    private _ngZone: NgZone
  ) {
    this.navCtrl.viewDidEnter.subscribe(e => {
      if (e.index === 0) {
        if (this.mapService.layersAreLoaded) {
          this.configService.freezeMapRenderer = false;
          this.mapService.map.resize();
        }
      }
    })
    this.navCtrl.viewWillEnter.subscribe(e => {
      if (e.index !== 0) {
        if (this.mapService.layersAreLoaded) {
          this.configService.freezeMapRenderer = true;
          this.mapService.map.stop()
        }
      } else {
        this.configService.freezeMapRenderer = false;
      }
    })
    // backButton
    this.platform.registerBackButtonAction(e => {
      this.presentConfirm();
    });

    mapService.eventShowModal.subscribe(data => {
      this.configService.freezeMapRenderer = true;
      let newPosition = (data.newPosition) ? data.newPosition : false;
      let modal = this.modalCtrl.create(ModalsContentPage, { type: data.type, data: data.geojson, newPosition: newPosition, origineData: data.origineData });
      modal.onDidDismiss(data => {
        this.configService.freezeMapRenderer = false;
        if (data) {
          if (data.type === 'Move') {
            this.mapService.eventMoveElement.emit(data);
          }
          if (data.redraw) {
            Observable.timer(100).subscribe(t => {
              this.mapService.eventMarkerReDraw.emit(this.dataService.getGeojson());
              this.mapService.eventMarkerChangedReDraw.emit(this.dataService.getGeojsonChanged());
            })
          }
        }
      });
      modal.present();
    });


    this.alertService.eventNewAlert.subscribe(alert => {
      this.presentToast(alert);
    })


  }

  openMenu() {

    this.menuCtrl.open();
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
      position: 'top',
      duration: 4000,
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
      this._ngZone.run(() => {
        that.alertService.displayToolTipRefreshData = true;
        Observable.timer(8000).subscribe(t => {
          that.alertService.displayToolTipRefreshData = false;
        })
      });

    })
  }
}
