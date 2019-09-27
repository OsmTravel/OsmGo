import { Component, NgZone, OnInit } from '@angular/core';
import {
  ModalController, Platform,
  // NavParams,
  LoadingController, ToastController, AlertController
} from '@ionic/angular';
import { NavParams } from '@ionic/angular';
import { OsmApiService } from '../../services/osmApi.service';
import { MapService } from '../../services/map.service';
import { DataService } from '../../services/data.service';
import { ConfigService } from '../../services/config.service';
import { AlertService } from '../../services/alert.service';
import { TagsService } from '../../services/tags.service';
import { ModalPrimaryTag } from './modal.primaryTag/modal.primaryTag';
import { ModalSelectList } from './modalSelectList/modalSelectList';

import * as _ from 'lodash';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'modal',
  templateUrl: './modal.html',
  styleUrls: ['./modal.scss']
})
export class ModalsContentPage implements OnInit {
  tags = []; // main data
  originalTags = [];
  feature;
  origineData: string;
  typeFiche;
  displayCode = false;
  mode;
  configOfPrimaryKey = { presets: [], alert: undefined };

  primaryKey = { key: '', value: '', lbl: '' };
  customValue = '';

  newTag = { key: '', value: '' };
  allTags;
  newPosition;
  displayAddTag = false;

  constructor(
    public platform: Platform,
    public params: NavParams,
    public loadingCtrl: LoadingController,
    public osmApi: OsmApiService,
    public tagsService: TagsService,
    public modalCtrl: ModalController,
    public mapService: MapService,
    public dataService: DataService,
    public configService: ConfigService,
    public alertService: AlertService,
    public toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private zone: NgZone,
    private translate: TranslateService

  ) {
    this.newPosition = params.data.newPosition;

    this.feature = JSON.parse(JSON.stringify(params.data.data));
    this.mode = params.data.type; // Read, Create, Update
    this.origineData = params.data.origineData;

    this.typeFiche = 'Loading'; // Edit, Read, Loading

    // converti les tags (object of objects) en array (d'objets) ([{key: key, value: v}])
    // tslint:disable-next-line:forin
    for (const tag in this.feature.properties.tags) {
      this.tags.push({ key: tag, value: this.feature.properties.tags[tag] });
    }
    // clone
    this.originalTags = JSON.parse(JSON.stringify(this.tags));

    // backButton
    // this.platform.registerBackButtonAction(e => {
    //   this.dismiss();
    // });
  }



  ngOnInit() { // override
    console.log(this.feature);
    this.initComponent();
  }

  presentConfirm() {
    this.alertCtrl.create({
      header: this.translate.instant('MODAL_SELECTED_ITEM.DELETE_CONFIRM_HEADER'),
      message: this.translate.instant('MODAL_SELECTED_ITEM.DELETE_CONFIRM_MESSAGE'),
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
            this.deleteOsmElement();
          }
        }
      ]
    }).then(alert => {
      alert.present();
    });

  }


  getPrimaryKeyOfTags(tags) {
    const feature = this.feature;
    const listOfPrimaryKey = this.tagsService.getListOfPrimaryKey();
    for (let i = 0; i < tags.length; i++) {
      if (listOfPrimaryKey.indexOf(tags[i].key) !== -1) {
        /* on ne prend pas en compte les ways exclus pour détérminer la primarykey*/
        if ((feature.properties.type === 'way' || feature.properties.type === 'relation')
          && this.tagsService.tags[tags[i].key].exclude_way_values
          && this.tagsService.tags[tags[i].key].exclude_way_values.indexOf(tags[i].value) !== -1
        ) {
          continue;
        }
        return JSON.parse(JSON.stringify(tags))[i];
      }
    }
    return undefined;
  }

  initComponent() {
    // Edit, Read, Loading
    this.typeFiche = (this.mode === 'Update' || this.mode === 'Create') ? 'Edit' : 'Read';
    // supprimer les valeurs vide de this.tags (changement de type)
    this.tags = this.tags.filter(tag => tag.value && tag.value !== '' && !tag.isDefaultValue);

    if (!this.tags.filter(tag => tag.key === 'name')[0]) { // on ajoute un nom vide si il n'existe pas
      this.tags.push({ key: 'name', value: '' });
    }
    // retourne la clé principale : {key: "amenity", value: "cafe"}
    this.primaryKey = this.getPrimaryKeyOfTags(this.tags);

    // la configuration pour cette clé principale (lbl, icon, presets[], ...)
    this.configOfPrimaryKey = this.tagsService.getTagConfigByKeyValue(this.primaryKey['key'], this.primaryKey['value']);
    const presetsIds = (this.configOfPrimaryKey && this.configOfPrimaryKey.presets) ? this.configOfPrimaryKey.presets : undefined;

    if (presetsIds && presetsIds.length > 0) {
      // on ajoute les presets manquant aux données 'tags' (chaine vide); + ajout 'name' si manquant
      for (let i = 0; i < presetsIds.length; i++) {
        const preset = this.tagsService.getPresetsById(presetsIds[i]);

        // le tag utilisant la clé du preset
        const tagOfPreset = this.tags.filter(tag => tag.key === preset.key)[0] || undefined;
        if (tagOfPreset) {
          tagOfPreset['preset'] = preset; // on met la config du prset direct dans le "tag" => key, value, preset[]
        } else { // => un le tag avec la key du preset n'existe pas, on l'insert vide
          this.tags.push({ 'key': preset.key, 'value': '', preset: preset });
        }
      }
    }
    // on ajoute les valeurs par defaut s'il on crée l'objet
    if (this.mode === 'Create' && this.configOfPrimaryKey['default_values']) {
      const default_values = this.configOfPrimaryKey['default_values'];
      for (let i = 0; i < default_values.length; i++) {
        const filteredTag = this.tags.filter(tag => tag.key === default_values[i].key);
        if (filteredTag[0]) { // le preset existe déja, on lui injecte la valeur
          filteredTag[0].value = default_values[i].value;
          filteredTag[0]['isDefaultValue'] = true;
        } else { // N'est pas présent dans les presets, on l'ajoute
          this.tags.push({ 'key': default_values[i].key, 'value': default_values[i].value, 'isDefaultValue': true });
        }
      }
    }
  }

  // les clés à exclure dans les "autres tags", (qui ne sont pas dans les presets donc)
  getExcludeKeysFromOtherTags(primaryKey, configOfPrimaryKey) {
    const res = [primaryKey, 'name'];
    if (!configOfPrimaryKey) {
      return res;
    }

    const presetsIds = configOfPrimaryKey.presets;
    for (let i = 0; i < presetsIds.length; i++) {
      if (this.tagsService.presets[presetsIds[i]].key){
        res.push(this.tagsService.presets[presetsIds[i]].key);
      }
    }
    return res;
  }

  dataIsChanged() {
    const tagsNotNull = [];
    for (let i = 0; i < this.tags.length; i++) {
      if (this.tags[i].value) {
        tagsNotNull.push({ 'key': this.tags[i].key, 'value': this.tags[i].value });
      }
    }

    const originalTagsNotNull = [];
    for (let i = 0; i < this.originalTags.length; i++) {
      if (this.originalTags[i].value && this.originalTags[i].value !== '' ) {
        originalTagsNotNull.push({ 'key': this.originalTags[i].key, 'value': this.originalTags[i].value });
      }
    }

    if (_.isEqual(tagsNotNull, originalTagsNotNull)) {
      return false;
    }
    return true;
  }

  updateMode() {
    this.zone.run(() => {
      this.mode = 'Update';
      this.typeFiche = 'Edit';
    });
  }

  toogleCode() { // affiche les tags originaux
    this.zone.run(() => {
      this.displayCode = (this.displayCode) ? false : true;
    });
  }

  addTag() {
    // TODO : controler que la clé n'existe pas et notifier le cas échéant
    if (this.newTag.key !== '' && this.newTag.value !== '') {
      this.newTag.key = this.newTag.key.trim();
      this.tags.push(this.newTag);
      this.newTag = { key: '', value: '' };
      this.displayAddTag = false;
    }
  }
  deleteTag(tag) {
    const idx = _.findIndex(this.tags, { key: tag.key });
    if (idx !== -1) {
      this.tags.splice(idx, 1);
    }
  }

  toLowerCase(text: string) {
    return text.toLowerCase();
  }

  // renvoie l'élément du tableau correspondant  || TODO => pipe
  findElement(array, kv) { // {'user': 'fred'}
    const idx = _.findIndex(array, kv);
    if (idx !== -1) {
      return array[idx];
    }
    return null;
  }

  dismiss(data = null) {
    this.modalCtrl.dismiss(data);
  }

  createOsmElement() {
    this.typeFiche = 'Loading';
    this.tagsService.setLastTagAdded(this.primaryKey);

    if(this.configService.getAddSurveyDate()){
      this.addSurveyDate()
    }

    this.pushTagsToFeature(); // on pousse les tags dans la feature
    if (this.configService.getIsDelayed()) {
      this.osmApi.createOsmNode(this.feature).subscribe(data => {
        this.dismiss({ redraw: true });
      });


    } else { // liveMode // on envoie le point sur le serveur OSM

      this.osmApi.getValidChangset(this.configService.getChangeSetComment()).subscribe(CS => {

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
            this.dismiss({ redraw: true });

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
    // si les tags et la position n'ont pas changé, on ne fait rien!
    if (!this.dataIsChanged() && !this.newPosition) {
      this.dismiss();
      return;
    }

    if(this.configService.getAddSurveyDate()){
      this.addSurveyDate()
    }
  
    this.pushTagsToFeature(); // on pousse les tags dans la feature

    if (this.configService.getIsDelayed()) {
      this.osmApi.updateOsmElement(this.feature, this.origineData).subscribe(data => {
        this.dismiss({ redraw: true });
      });
    } else {
      this.osmApi.getValidChangset(this.configService.getChangeSetComment()).subscribe(CS => {
        this.osmApi.apiOsmUpdateOsmElement(this.feature, CS)
          .subscribe(data => {
            this.feature.properties.meta.version++;
            this.feature.properties.meta['user'] = this.osmApi.getUserInfo().user;
            this.feature.properties.meta['uid'] = this.osmApi.getUserInfo().uid;
            this.feature.properties.meta['timestamp'] = new Date().toISOString();
            this.feature = this.mapService.getIconStyle(this.feature); // création du style
            this.dataService.updateFeatureToGeojson(this.feature);
            this.dismiss({ redraw: true });
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
        this.dismiss({ redraw: true });
      });
    } else {
      this.osmApi.getValidChangset(this.configService.getChangeSetComment()).subscribe(CS => {
        this.osmApi.apiOsmDeleteOsmElement(this.feature, CS)
          .subscribe(data => {
            this.dataService.deleteFeatureFromGeojson(this.feature);
            // this.mapService.eventMarkerReDraw.emit(this.dataService.getMergedGeojsonGeojsonChanged());
            this.dismiss({ redraw: true });

          },
            error => {
              this.typeFiche = 'Edit';
              this.presentToast(error.statusText + ' : ' + error.text());
            });
      });
    }

  }

  pushTagsToFeature() {
    const tagObjects = {};
    for (let i = 0; i < this.tags.length; i++) {
      tagObjects[this.tags[i].key] = this.tags[i].value;
    }
    this.feature.properties.tags = tagObjects;
  }

  moveOsmElement() {
    this.pushTagsToFeature();
    // on ferme la modal
    this.dismiss({ type: 'Move', 'geojson': this.feature, mode: this.mode });
  }
  async openPrimaryTagModal() {
    const data = { geojson: this.feature, configOfPrimaryKey: this.configOfPrimaryKey, primaryKey: this.primaryKey, tags: this.tags };
    // const modal = this.modalCtrl.create(ModalPrimaryTag, data);

    const modal = await this.modalCtrl.create({
      component: ModalPrimaryTag,
      componentProps: { geojson: this.feature, configOfPrimaryKey: this.configOfPrimaryKey, primaryKey: this.primaryKey, tags: this.tags }
    });
    await modal.present();

    modal.onDidDismiss().then(d => {
      const _data = d.data;
      if (_data) {
        // on trouve l'index de l'ancien type pour le remplacer par le nouveau;
        const idx = _.findIndex(this.tags,
          o => o.key === this.primaryKey.key && o.value === this.primaryKey.value);

        this.tags[idx] = JSON.parse(JSON.stringify(_data));
        this.primaryKey = JSON.parse(JSON.stringify(_data));
        this.initComponent();
      }
    });
  }

  async openModalList(data) {

    const modal = await this.modalCtrl.create({
      component: ModalSelectList,
      componentProps: data
    });
    await modal.present();

    modal.onDidDismiss().then(d => {
      const _data = d.data;
      if (_data) {
        this.tags.filter(tag => tag.key === _data.key)[0].value = _data.value;
      }
    });



  }

  cancelChange() {
    this.dataService.cancelFeatureChange(this.feature);
    this.dismiss({ redraw: true });
  }
  presentToast(message) {
    this.toastCtrl.create({
      message: message,
      duration: 5000,
      showCloseButton: true,
      closeButtonText: 'X'
    }).then(toast => {
      toast.present();
    });

  }

  confirmAddSurveyDate() {
    this.alertCtrl.create({
      header: this.translate.instant('MODAL_SELECTED_ITEM.ADD_SURVEY_DATE_CONFIRM_HEADER'), 
      subHeader: this.translate.instant('MODAL_SELECTED_ITEM.ADD_SURVEY_DATE_CONFIRM_MESSAGE'),
      buttons: [
        {
          text: this.translate.instant('SHARED.NO'),
          role: 'cancel',
          handler: data => {
          }
        },
        {
          text: this.translate.instant('SHARED.YES'),
          handler: data => {
            this.addSurveyDate();
            this.updateOsmElement();
          }
        }
      ]
    })
      .then(alert => {
        alert.present();
      });

  }

  addSurveyDate() {
    const now = new Date;
    const YYYY = now.getFullYear();
    const MM = ((now.getMonth()) + 1 < 10) ? '0' + (now.getMonth() + 1) : '' + (now.getMonth() + 1);
    const DD = (now.getDate() < 10) ? '0' + now.getDate() : '' + now.getDate();
    const isoDate = YYYY + '-' + MM + '-' + DD;

    let tagSurveyIndex = -1;
    for (let i = 0; i < this.tags.length; i++) {
      if (this.tags[i].key === 'survey:date') {
        tagSurveyIndex = i;
        break;
      }
    }
    if (tagSurveyIndex !== -1) { // le tag existe déjà, on l'écrase
      this.tags[tagSurveyIndex].value = isoDate;
    } else {
      this.tags.push({ 'key': 'survey:date', 'value': isoDate });
    }

   
  }

}
