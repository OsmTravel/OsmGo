import { Component } from '@angular/core';
import { ModalController, Platform, NavParams, ViewController, LoadingController, ToastController, AlertController } from 'ionic-angular';
import { OsmApiService } from '../../services/osmApi.service';
import { MapService } from '../../services/map.service';
import { DataService } from '../../services/data.service';
import { ConfigService } from '../../services/config.service';
import { AlertService } from '../../services/alert.service';

import { TagsService } from '../../services/tags.service';


import { ModalPrimaryTag } from './modal.primaryTag/modal.primaryTag';
import { ModalSelectList } from './modalSelectList/modalSelectList';

declare var _;

@Component({
  selector: 'modal',
  templateUrl: 'modal.html'
})
export class ModalsContentPage {

  tags = []; // main data
  originalTags = [];
  feature;
  origineData:string;
  typeFiche;
  displayCode = false;
  mode;
  configOfPrimaryKey = { presets: [] };
  currentPresets = {};
  primaryKey = { key: '', value: '', lbl: '' };
  customValue = '';
  // primaryKeys = [];
  newTag = { key: '', value: '' };
  allTags;
  newPosition;
  displayAddTag = false;

  constructor(
    public platform: Platform,
    public params: NavParams,
    public viewCtrl: ViewController,
    public loadingCtrl: LoadingController,
    public osmApi: OsmApiService,
    public tagsService: TagsService,
    public modalCtrl: ModalController,
    public mapService: MapService,
    public dataService: DataService,
    public configService: ConfigService,
    public alertService: AlertService,
    public toastCtrl: ToastController,
    private alertCtrl: AlertController

  ) {

    this.newPosition = params.data.newPosition;

    this.feature = JSON.parse(JSON.stringify(params.data.data));
    this.mode = params.data.type; // Read, Create, Update
    this.origineData = params.data.origineData;

    this.typeFiche = 'Loading'; // Edit, Read, Loading

    // converti les tags (object of objects) en array (d'objets) ([{key: key, value: v}])
    for (let tag in this.feature.properties.tags) {
      this.tags.push({ key: tag, value: this.feature.properties.tags[tag] });
    }
    this.originalTags = JSON.parse(JSON.stringify(this.tags));

    // backButton
    this.platform.registerBackButtonAction(e => {
      this.dismiss();
    });
  }



  ngOnInit() { // override
    this.initComponent();
  }

  presentConfirm() {
    let alert = this.alertCtrl.create({
      title: 'Vraiment?',
      message: 'Supprimer cet élément?',
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
            this.deleteOsmElement()
          }
        }
      ]
    });
    alert.present();
  }


  getPrimaryKeyOfTags() {
    let listOfPrimaryKey = this.tagsService.getListOfPrimaryKey();
    for (let i = 0; i < this.tags.length; i++) {
      if (listOfPrimaryKey.indexOf(this.tags[i].key) !== -1)
        return JSON.parse(JSON.stringify(this.tags))[i];
    }
    return null;
  }

  getConfigOfPrimarykey() {
    let ind = _.findIndex(this.allTags[this.primaryKey.key].values, { 'key': this.primaryKey.value });
    return this.allTags[this.primaryKey.key].values[ind];
  }

  clearNullTags() {
    // supprimer les valeurs vide de this.tags (changement de type)
    for (let i = 0; i < this.tags.length; i++) {

      if (this.tags[i].value === '' || !this.tags[i].value) {

        this.tags.splice(i, 1);
        i--;
      };
    }
  }
  initComponent() {
    // supprimer les valeurs vide de this.tags (changement de type)
    this.clearNullTags();
    if (_.findIndex(this.tags, { key: 'name' }) === -1) // on ajoute un nom vide si il n'existe pas
      this.tags.push({ key: 'name', value: '' });

    this.tagsService.getAllTags().subscribe(allTags => {
      this.allTags = allTags;
      this.primaryKey = this.getPrimaryKeyOfTags();

      this.configOfPrimaryKey = this.getConfigOfPrimarykey();
      this.typeFiche = (this.mode === 'Update' || this.mode === 'Create') ? 'Edit' : 'Read'; // Edit, Read, Loading

      if (this.configOfPrimaryKey) {
        if (this.configOfPrimaryKey.presets.length > 0) {
          // on ajoute les presets manquant aux données 'tags' (chaine vide); + ajout 'name' si manquant
          for (let i = 0; i < this.configOfPrimaryKey.presets.length; i++) {
            if (_.findIndex(this.tags, { key: this.configOfPrimaryKey.presets[i] }) === -1)
              this.tags.push({ key: this.configOfPrimaryKey.presets[i], value: '' });
          }
          this.tagsService.getPresets(this.configOfPrimaryKey.presets).subscribe(presets => {
            this.currentPresets = presets;
          });
        }
      }
    });


  }

  dataIsChanged() {
    let tagsNotNull = [];
    for (let i = 0; i < this.tags.length; i++) {
      if (this.tags[i].value)
        tagsNotNull.push(this.tags[i]);
    }
    if (_.isEqual(tagsNotNull, this.originalTags)) {
      return false;
    }
    return true;
  }

  updateMode() {
    this.mode = 'Update';
    this.typeFiche = 'Edit';
  }

  toogleCode() { // affiche les tags originaux
    this.displayCode = (this.displayCode) ? false : true;
  }

  addTag() {
    // controler que la clé n'existe pas
    if (this.newTag.key != '' && this.newTag.value !== '') {
      this.tags.push(this.newTag);
      this.newTag = { key: '', value: '' };
      this.displayAddTag = false;
    }
  }
  deleteTag(tag) {
    let idx = _.findIndex(this.tags, { key: tag.key });
    if (idx !== -1) {
      this.tags.splice(idx, 1);
    }
  }

  toLowerCase(text: string) {
    return text.toLowerCase();
  }

  // renvoie l'élément du tableau correspondant 
  findElement(array, kv) { // {'user': 'fred'}
    let idx = _.findIndex(array, kv);
    if (idx !== -1) {
      return array[idx];
    }
    return null;
  }


  dismiss(data = null) {
    this.viewCtrl.dismiss(data);
  }

  createOsmElement() {
    this.typeFiche = 'Loading';
    this.tagsService.setLastTagAdded(this.primaryKey);

    this.pushTagsToFeature(); // on pousse les tags dans la feature
    if (this.configService.getIsDelayed()) {
        this.osmApi.createOsmNode(this.feature).subscribe(data => {
          this.dismiss({redraw: true});
        })
     

    }

    else { //liveMode // on envoie le point sur le serveur OSM

      this.osmApi.getValidChangset(this.osmApi.getChangesetComment()).subscribe(CS => {

        this.osmApi.apiOsmCreateNode(this.feature, CS)
          .subscribe(data => {
            this.feature['id'] = 'node/' + data;
            this.feature.properties.id = data;
            this.feature.properties.meta = {};
            this.feature.properties.meta['version'] = 1;
            this.feature.properties.meta['user'] = this.osmApi.getUserInfo().user;
            this.feature.properties.meta['uid'] = this.osmApi.getUserInfo().uid;
            this.feature.properties.meta['timestamp'] = new Date().toISOString();
            this.feature = this.mapService.getIconStyle(this.feature); // style

            this.dataService.addFeatureToGeojson(this.feature);
            this.dismiss({redraw: true});

          },
          error => {
            this.typeFiche = 'Edit';
            this.presentToast(JSON.stringify(error));
          });
      },
        error => {
          this.typeFiche = 'Edit';
          this.presentToast(JSON.stringify(error));
        });
    }
  }

  updateOsmElement() {
    this.typeFiche = 'Loading';
    this.pushTagsToFeature(); // on pousse les tags dans la feature

    if (this.configService.getIsDelayed()) {
      this.osmApi.updateOsmElement(this.feature, this.origineData).subscribe(data => {
        this.dismiss({redraw: true});
      })
    }

    else {
      this.osmApi.getValidChangset(this.osmApi.getChangesetComment()).subscribe(CS => {
        this.osmApi.apiOsmUpdateOsmElement(this.feature, CS)
          .subscribe(data => {
            this.feature.properties.meta.version++;
            this.feature.properties.meta['user'] = this.osmApi.getUserInfo().user;
            this.feature.properties.meta['uid'] = this.osmApi.getUserInfo().uid;
            this.feature.properties.meta['timestamp'] = new Date().toISOString();
            this.feature = this.mapService.getIconStyle(this.feature); // création du style
            this.dataService.updateFeatureToGeojson(this.feature);
            this.dismiss({redraw: true});
          },
          er => {
            this.typeFiche = 'Edit';
            this.presentToast(er.statusText + ' : ' + er.text());
          });

      },
        error => {
          this.typeFiche = 'Edit';
          this.presentToast(error);
        });
    }

  }

  deleteOsmElement() {
    this.typeFiche = 'Loading';

    if (this.configService.getIsDelayed()) {
      this.osmApi.deleteOsmElement(this.feature).subscribe(data => {
        this.dismiss({redraw: true});
      })
    }
    else {
      this.osmApi.getValidChangset(this.osmApi.getChangesetComment()).subscribe(CS => {
        this.osmApi.apiOsmDeleteOsmElement(this.feature, CS)
          .subscribe(data => {
            this.dataService.deleteFeatureFromGeojson(this.feature);
           // this.mapService.eventMarkerReDraw.emit(this.dataService.getMergedGeojsonGeojsonChanged());
           this.dismiss({redraw: true});
  
          },
          error => {
            this.typeFiche = 'Edit';
            this.presentToast(error.statusText + ' : ' + error.text());
          });
      });
    }

  }

  pushTagsToFeature() {
    let tagObjects = {};
    for (let i = 0; i < this.tags.length; i++) {
      tagObjects[this.tags[i].key] = this.tags[i].value;
    }
    this.feature.properties.tags = tagObjects;
  }

  moveOsmElement() {
    this.pushTagsToFeature();
    // on ferme la modal
    this.dismiss({ type: 'Move', 'geojson': this.feature, mode: this.mode });

    // on emet l'evenement 
  }
  openPrimaryTagModal() {

    let data = { geojson: this.feature, configOfPrimaryKey: this.configOfPrimaryKey, primaryKey: this.primaryKey, tags: this.tags };
    let modal = this.modalCtrl.create(ModalPrimaryTag, data);

    // onDidDismiss => modifier tags Key
    modal.onDidDismiss(data => {
      if (data) {
        // on trouve l'index de l'ancien type pour le remplacer par le nouveau;
        let idx = _.findIndex(this.tags, { key: this.primaryKey.key, value: this.primaryKey.value });
        this.tags[idx] = JSON.parse(JSON.stringify(data));
        this.primaryKey = JSON.parse(JSON.stringify(data));
        this.initComponent();
      }
    });
    modal.present();
  }

  openModalList(data) {
    let modal = this.modalCtrl.create(ModalSelectList, data);

    modal.onDidDismiss(data => {
      if (data) {
        let idx = _.findIndex(this.tags, { key: data.key });
        this.tags[idx] = JSON.parse(JSON.stringify(data));
      }
    });

    modal.present();
  };

  cancelChange() {
    this.dataService.cancelFeatureChange(this.feature);
   // this.mapService.eventMarkerReDraw.emit(this.dataService.getMergedGeojsonGeojsonChanged());
     this.dismiss({redraw: true});
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


}