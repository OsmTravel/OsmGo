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
import { AlertComponent } from './components/alert/alert.component';
import { getConfigTag } from '../../../../scripts/osmToOsmgo/index.js'

import { Feature, Tag, Preset, PrimaryTag, TagConfig } from '../../../type'

import { cloneDeep, isEqual, findIndex } from 'lodash';
import { TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'modal',
  templateUrl: './modal.html',
  styleUrls: ['./modal.scss']
})
export class ModalsContentPage implements OnInit {
  tags: Tag[] = []; // main data
  originalTags = [];
  feature: Feature;
  origineData: string;
  typeFiche: string;
  displayCode: boolean = false;
  mode;
  tagConfig: TagConfig
  primaryKey: PrimaryTag
  savedFields;
  tagId: string;


  customValue = '';

  newTag = { key: '', value: '' };
  allTags;
  newPosition;
  displayAddTag = false;
  presetsIds = [];

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
    this.feature = cloneDeep(params.data.data);

    this.mode = params.data.type; // Read, Create, Update
    this.origineData = this.params.data.origineData; // literal, sources
    this.typeFiche = 'Loading'; // Edit, Read, Loading

    // converti les tags (object of objects) en array (d'objets) ([{key: key, value: v}])
    // tslint:disable-next-line:forin
    for (const tag in this.feature.properties.tags) {
      this.tags.push({ key: tag, value: this.feature.properties.tags[tag] });
    }
    // clone
    this.originalTags = cloneDeep(this.tags);

  }



  ngOnInit() { // override
    this.initComponent();

    if (this.mode === 'Create') {
      this.openPrimaryTagModal();
    }
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

  initComponent(tagConfig: TagConfig = null) {


    this.primaryKey = this.tagsService.findPkey(this.tags);


    this.feature.properties.primaryTag = this.primaryKey
    // Edit, Read, Loading
    this.typeFiche = (this.mode === 'Update' || this.mode === 'Create') ? 'Edit' : 'Read'; // ?

    // supprimer les valeurs vide de this.tags (changement de type)
    this.tags = this.tags.filter(tag => tag.value && tag.value !== '' && !tag.isDefaultValue);
    if (!this.tags.find(tag => tag.key === 'name')) { // on ajoute un nom vide si il n'existe pas
      this.tags.push({ key: 'name', value: '' });
    }

    // la configuration pour cette clé principale (lbl, icon, presets[], ...)
    if (!tagConfig) {
      this.tagConfig = getConfigTag(this.feature, this.tagsService.tags);       
    } else {
      this.tagConfig = tagConfig;
    }

    if (!this.primaryKey) {
      this.primaryKey = this.tagsService.findPkey((this.tags));
    }
    this.tagId = this.tagConfig && this.tagConfig.id ? this.tagConfig.id : `${this.primaryKey.key}/${this.primaryKey.value}`;
    this.savedFields = this.tagsService.savedFields[this.tagId];

    this.presetsIds = (this.tagConfig && this.tagConfig.presets) ? this.tagConfig.presets : undefined;

    if (this.presetsIds && this.presetsIds.length > 0) {
      // on ajoute les presets manquant aux données 'tags' (chaine vide); + ajout 'name' si manquant
      for (let i = 0; i < this.presetsIds.length; i++) {
        const preset: Preset = this.tagsService.presets[this.presetsIds[i]];

        // le tag utilisant la clé du preset
        const tagOfPreset: Tag = this.tags.find(tag => tag.key === preset.key) || undefined;

        if (tagOfPreset) {
          tagOfPreset['preset'] = preset; // on met la config du prset direct dans le "tag" => key, value, preset[]
        } else { // => un le tag avec la key du preset n'existe pas, on l'insert vide
          this.tags.push({ 'key': preset.key, 'value': '', preset: preset });
        }
      }
    }

    return { tagConfig: this.tagConfig, tags: this.tags, feature: this.feature }
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
      if (this.originalTags[i].value && this.originalTags[i].value !== '') {
        originalTagsNotNull.push({ 'key': this.originalTags[i].key, 'value': this.originalTags[i].value });
      }
    }

    if (isEqual(tagsNotNull, originalTagsNotNull)) {
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
    const idx = findIndex(this.tags, { key: tag.key });
    if (idx !== -1) {
      this.tags.splice(idx, 1);
    }
  }

  toLowerCase(text: string) {
    return text.toLowerCase();
  }

  // renvoie l'élément du tableau correspondant  || TODO => pipe
  findElement(array, kv) { // {'user': 'fred'}
    const idx = findIndex(array, kv);
    if (idx !== -1) {
      return array[idx];
    }
    return null;
  }

  dismiss(data = null) {
    this.modalCtrl.dismiss(data);
  }

  createOsmElement(tagconfig) {
    this.typeFiche = 'Loading';
    this.tagsService.addTagTolastTagsUsed(tagconfig.id);

    if (this.configService.getAddSurveyDate()) {
      this.addSurveyDate()
    }

    this.pushTagsToFeature(); // on pousse les tags dans la feature
    this.osmApi.createOsmNode(this.feature).subscribe(data => {
      this.dismiss({ redraw: true });
    });
  }



  updateOsmElement(tagconfig) {
    this.typeFiche = 'Loading';

    this.tagsService.addTagTolastTagsUsed(tagconfig ? tagconfig.id : null);
    // si les tags et la position n'ont pas changé, on ne fait rien!
    if (!this.dataIsChanged() && !this.newPosition) {
      this.dismiss();
      return;
    }

    if (this.configService.getAddSurveyDate()) {
      this.addSurveyDate()
    }

    this.pushTagsToFeature(); // on pousse les tags dans la feature

    this.osmApi.updateOsmElement(this.feature, this.origineData).subscribe(data => {
      this.dismiss({ redraw: true });
    });


  }

  deleteOsmElement() {
    this.typeFiche = 'Loading';
    this.osmApi.deleteOsmElement(this.feature).subscribe(data => {
      this.dismiss({ redraw: true });
    });


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
    const modal = await this.modalCtrl.create({
      component: ModalPrimaryTag,
      componentProps: { geojson: this.feature, tagConfig: this.tagConfig, tags: this.tags }
    });
    await modal.present();
    modal.onDidDismiss()
      .then(d => {
        const _data = d.data;
        if (_data) {
          const oldPrimaryTag = this.tagsService.findPkey(this.tags);
          // deleting old primary tag
          if (oldPrimaryTag && this.tags) {
            this.tags = this.tags.filter(t => t.key !== oldPrimaryTag.key)
          }

          // DELETING tags in old preset
          if (this.tagConfig && this.tagConfig['tags']) {
            const oldKeysTag = Object.keys(this.tagConfig['tags'])
            this.tags = this.tags.filter(t => !oldKeysTag.includes(t.key))
          }

          // this.tagConfig => primary key

          if (_data.tags) {
            for (let k in _data.tags) {
              let targetInd = this.tags.findIndex(t => t.key == k);
              if (targetInd >= 0) {
                this.tags[targetInd] = { "key": k, "value": _data.tags[k] }
              } else {
                this.tags = [...this.tags, { "key": k, "value": _data.tags[k] }]
              }
            }
          }
          this.tagId = d.data.id;


          this.zone.run(() => {
            const result = this.initComponent(cloneDeep(_data))
            this.tagConfig = result.tagConfig;
          })

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
        if (_data.tags) { // add or remplace tags...
          for (let t in _data.tags) {
            const tagIndex = this.tags.findIndex(o => o.key == t);
            if (tagIndex !== -1) {
              this.tags[tagIndex] = { "key": t, "value": _data.tags[t] };
            } else {
              this.tags = [...this.tags, { "key": t, "value": _data.tags[t] }]
            }
          }

        }
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
            this.updateOsmElement(null);
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
      if (this.tags[i].key === this.configService.config.checkedKey) {
        tagSurveyIndex = i;
        break;
      }
    }
    if (tagSurveyIndex !== -1) { // le tag existe déjà, on l'écrase
      this.tags[tagSurveyIndex].value = isoDate;
    } else {
      this.tags.push({ 'key': this.configService.config.checkedKey, 'value': isoDate });
    }
  }

  saveFields(tagId, tags) {
    const savedTags = tags.map(t => { return { key: t.key, value: t.value } })
      .filter(t => t.key !== 'name')
      .filter(t => t.key !== 'survey:date')
      .filter(t => t.key !== 'check_date')
    this.tagsService.addSavedField(tagId, savedTags);
    if (!this.savedFields) this.savedFields = {};
    this.savedFields['tags'] = [...savedTags];
  }

  restoreFields() {
    if (this.savedFields) {
      for (let stags of this.savedFields.tags) {
        let t = this.tags.find(o => o.key === stags.key)
        if (t) {
          t['value'] = stags.value
        } else {
          this.tags.push(stags)
        }
      }
    }
  }


  fixDeprecated(deprecated: any) {

    const deprecadetKeys = Object.keys(deprecated.old)
    // delete old tags
    this.tags = this.tags.filter(t => !deprecadetKeys.includes(t.key))

    for (let depold of deprecadetKeys) {
      if (this.feature.properties[depold]) {
        delete this.feature.properties[depold];
      }
    }
    this.feature.properties.tags = { ...deprecated.replace, ...this.feature.properties.tags }

    // add new
    for (let k in deprecated.replace) {
      this.tags = [{ 'key': k, 'value': deprecated.replace[k] }, ...this.tags]
    }

    if (this.mode !== 'Update') {
      this.mode = 'Update';
      this.typeFiche = 'Edit'
    }
    this.initComponent();
  }


  addOrRemoveBookmark(tag : TagConfig) {
    if (!this.tagsService.bookmarksIds.includes(tag.id)) {
      this.tagsService.addBookMark(tag.id)
    } else {
      this.tagsService.removeBookMark(tag.id)
    }
  }


}
