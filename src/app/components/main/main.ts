import { Component, NgZone, AfterViewInit } from '@angular/core';
import {
  NavController, MenuController,
  ModalController, ToastController, Platform, AlertController, LoadingController
} from '@ionic/angular';


import { OsmApiService } from '../../services/osmApi.service';
import { TagsService } from '../../services/tags.service';
import { MapService } from '../../services/map.service';
import { DataService } from '../../services/data.service';
import { LocationService } from '../../services/location.service';
import { AlertService } from '../../services/alert.service';
import { ConfigService } from '../../services/config.service';
import { ModalsContentPage } from '../modal/modal';

import { timer } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { IconService } from 'src/app/services/icon.service';
import { SwUpdate } from '@angular/service-worker';
import { StatesService } from 'src/app/services/states.service';

import { Plugins } from '@capacitor/core';

const { App } = Plugins;

@Component({
  templateUrl: './main.html',
  selector: 'main',
  styleUrls: ['./main.scss']
})

export class MainPage implements AfterViewInit {
  modalIsOpen = false;
  menuIsOpen = false;
  newVersion = false;

  constructor(public navCtrl: NavController,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public menuCtrl: MenuController,
    public osmApi: OsmApiService,
    public tagsService: TagsService,
    public mapService: MapService,
    public dataService: DataService,
    public locationService: LocationService,
    public alertService: AlertService,
    public configService: ConfigService,

    private alertCtrl: AlertController,
    private _ngZone: NgZone,
    private router: Router,
    private translate: TranslateService,
    public iconService: IconService,
    public loadingController: LoadingController,
    private swUpdate: SwUpdate,
    public statesService: StatesService
  ) {



    this.router.events.subscribe((e) => {

      if (e instanceof NavigationEnd) {
        if (e['urlAfterRedirects'] === '/main') {
          this.configService.freezeMapRenderer = false;
          // la carte ne detect pas toujours le changement de taille du DOM...
          if (this.mapService.map) {
            timer(300).subscribe(t => {
              this.mapService.map.resize();
            });
          }

        } else {
          this.configService.freezeMapRenderer = true;
        }
      }
    });

    mapService.eventShowModal.subscribe(async (_data) => {

      this.configService.freezeMapRenderer = true;
      const newPosition = (_data.newPosition) ? _data.newPosition : false;


      const modal = await this.modalCtrl.create({
        component: ModalsContentPage,
        componentProps: { type: _data.type, data: _data.geojson, newPosition: newPosition, origineData: _data.origineData }
      });
      await modal.present();
      this.modalIsOpen = true;

      modal.onDidDismiss().then(d => {
        this.modalIsOpen = false;
        const data = d.data;
        this.configService.freezeMapRenderer = false;
        if (data) {
          if (data['type'] === 'Move') {
            this.mapService.eventMoveElement.emit(data);
          }
          if (data['redraw']) {
            timer(50).subscribe(t => {
              this.mapService.eventMarkerReDraw.emit(this.dataService.getGeojson());
              this.mapService.eventMarkerChangedReDraw.emit(this.dataService.getGeojsonChanged());
            });
          }
        }
      });

    });


    this.alertService.eventNewAlert.subscribe(alert => {
      this.presentToast(alert);
    });


  }

  ngOnInit(): void {
    // sync user and isAuth

    this.swUpdate.available.subscribe(event => {
      this.newVersion = true;
    });
  }

  openMenu() {
    this.configService.freezeMapRenderer = true;
    this.menuIsOpen = true;
    // history.pushState({menu:'open'}, 'menu')
  }

  closeMenu() {
    this.configService.freezeMapRenderer = false;
    this.menuIsOpen = false;
  }

  onMapResized(e) {
    if (this.mapService.map) {
      this.mapService.map.resize();
    }

  }



  presentConfirm() {
    this.alertCtrl.create({
      header: this.translate.instant('MAIN.EXIT_CONFIRM_HEADER'),
      message: this.translate.instant('MAIN.EXIT_CONFIRM_MESSAGE'),
      buttons: [
        {
          text: this.translate.instant('SHARED.NO'),
          role: 'cancel',
          handler: () => {

          }
        },
        {
          text: this.translate.instant('SHARED.YES'),
          handler: () => {
            window.navigator['app'].exitApp();
          }
        }
      ]
    }).then(alert => {
      alert.present();
    });

  }

  loadData() {
    // L'utilisateur charge les données, on supprime donc le tooltip
    this._ngZone.run(() => {
      this.alertService.displayToolTipRefreshData = false;
      this.mapService.loadingData = true;
    });


    const bbox: any = this.mapService.getBbox();
    this.osmApi.getDataFromBbox(bbox)
      .subscribe(data => { // data = geojson a partir du serveur osm

      },
        err => {
          this.mapService.loadingData = false;
          console.log(err);
          this.presentToast(err);
        });
  }


  presentToast(message) {
    this.toastCtrl.create({
      message: message,
      position: 'top',
      duration: 4000,
      showCloseButton: true,
      closeButtonText: 'X'
    })
      .then(toast => {
        toast.present();
      });

  }

  ngAfterViewInit() {

    // TODO: Dirty... use rxjs mergemap ?

    this.configService.getI18nConfig$().subscribe(async i18nConfig => {

      this.configService.i18nConfig = i18nConfig;
      const e = await this.configService.loadConfig(i18nConfig)

      this.osmApi.initAuth();
      if (!this.osmApi.isAuthenticated() || !this.osmApi.getUserInfo().connected) {
        this.osmApi.resetUserInfo();
        this.osmApi.logout()
      }


      this.translate.use(this.configService.config.languageUi);

      // TODO: switchmap
      this.tagsService.loadLastTagAdded$().subscribe()
      this.tagsService.loadBookMarks$().subscribe()

      this.tagsService.loadTagsAndPresets$(this.configService.config.languageTags, this.configService.config.countryTags)
        .subscribe(async e => {

          const missingIcons: string[] = await this.iconService.getMissingSpirtes();

          if (missingIcons.length > 0) {
            const loading = await this.loadingController.create({
              message: this.translate.instant('MAIN.CREATING_MISSING_ICONS')
            });
            await loading.present();
            const missingSprites: string[] = await this.iconService.getMissingSpirtes();
            for (let missIcon of missingSprites) {

              let uriIcon = await this.iconService.generateMarkerByIconId(missIcon)
              this.dataService.addIconCache(missIcon, uriIcon)

            }
            loading.dismiss();
          }
        });

      this.mapService.eventDomMainReady.emit(document.getElementById('map'));



    });



    this.alertService.eventDisplayToolTipRefreshData.subscribe(async e => {

      const toast = await this.toastCtrl.create({
        position: 'bottom',
        message: this.translate.instant('MAIN.LOAD_BBOX'),
        showCloseButton: true,
        duration: 6000,
        closeButtonText: 'Ok'
      });
      toast.present();
      toast.onDidDismiss().then(ev => {
        if (ev.role === 'cancel') {
          if (this.mapService.map && this.mapService.map.getZoom() > 16) {
            this.loadData();
          }
        }
      });
    });



    window.addEventListener('load', (e) => {
      window.history.pushState({ noBackExitsApp: true }, '')
    })

    window.addEventListener('popstate', (e) => {
      if (this.menuIsOpen) {
        window.history.pushState({ noBackExitsApp: true }, '')
        this.closeMenu();
      } else if (this.modalIsOpen) {
        window.history.pushState({ noBackExitsApp: true }, '')
        this.modalCtrl.dismiss();
      } else {
        window.history.pushState({ noBackExitsApp: true }, '')
      }
    })

  }

  exitApp() {
    App.exitApp()
  }
}
