import {
    Component,
    NgZone,
    OnInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core'
import {
    ModalController,
    Platform,
    LoadingController,
    ToastController,
    AlertController,
} from '@ionic/angular'
import { NavParams } from '@ionic/angular'
import { OsmApiService } from '@services/osmApi.service'
import { MapService } from '@services/map.service'
import { DataService } from '@services/data.service'
import { ConfigService } from '@services/config.service'
import { AlertService } from '@services/alert.service'
import { TagsService } from '@services/tags.service'
import { ModalPrimaryTag } from './modal.primaryTag/modal.primaryTag'
import { ModalSelectList } from './modalSelectList/modalSelectList'
import { ModalAddTag } from './modal.addTag/modal.addTag'
import { getConfigTag } from '@scripts/osmToOsmgo/index.js'

import { Tag, Preset, PrimaryTag, TagConfig, OsmGoFeature } from '@osmgo/type'

import { cloneDeep, isEqual, findIndex } from 'lodash'
import { TranslateService } from '@ngx-translate/core'
import {
    LineString,
    MultiLineString,
    MultiPolygon,
    Point,
    Polygon,
} from 'geojson'

export interface ModalDismissData {
    redraw?: boolean
    type?: string
    geojson?: OsmGoFeature<
        Point | LineString | MultiLineString | Polygon | MultiPolygon
    >
    mode?: any
}
@Component({
    selector: 'modal',
    templateUrl: './modal.html',
    styleUrls: ['./modal.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalsContentPage implements OnInit {
    tags: Tag[] = [] // main data
    originalTags = []
    feature: OsmGoFeature<
        Point | LineString | MultiLineString | Polygon | MultiPolygon
    >
    origineData: string
    typeFiche: string
    displayCode: boolean = false
    mode
    tagConfig: TagConfig
    primaryKey: PrimaryTag
    savedFields
    tagId: string
    geometryType: 'point' | 'vertex' | 'line' | 'area'

    customValue = ''

    allTags
    newPosition
    presetsIds = []

    lastSurvey?: Date

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
        private translate: TranslateService,
        private cdr: ChangeDetectorRef
    ) {
        this.newPosition = params.data.newPosition
        this.feature = cloneDeep(params.data.data)

        const originalFeatureGeometry = this.feature.properties.way_geometry
            ? this.feature.properties.way_geometry
            : this.feature.geometry
        const typeGeomFeature = originalFeatureGeometry.type
        const usedByWay = this.feature.properties.usedByWays ? true : false
        if (typeGeomFeature === 'Point' && !usedByWay) {
            this.geometryType = 'point'
        } else if (typeGeomFeature === 'Point' && usedByWay) {
            this.geometryType = 'vertex'
        } else if (
            typeGeomFeature === 'LineString' ||
            typeGeomFeature === 'MultiLineString'
        ) {
            this.geometryType = 'line'
        } else if (
            typeGeomFeature === 'Polygon' ||
            typeGeomFeature === 'MultiPolygon'
        ) {
            this.geometryType = 'area'
        }

        this.mode = params.data.type // Read, Create, Update
        this.origineData = this.params.data.origineData // literal, sources
        this.typeFiche = 'Loading' // Edit, Read, Loading

        const surveyDates = []

        // converti les tags (object of objects) en array (d'objets) ([{key: key, value: v}])
        // tslint:disable-next-line:forin
        for (const tag in this.feature.properties.tags) {
            const preset = tagsService.presets[tag.replace(':', '/')]
            const data: Tag = {
                key: tag,
                value: this.feature.properties.tags[tag],
            }
            if (preset) data.preset = preset
            this.tags.push(data)

            if (['survey:date', 'check_date'].includes(tag)) {
                const surveyValue = new Date(this.feature.properties.tags[tag])
                surveyValue.setHours(0, 0, 0, 0) // Reset hours
                surveyDates.push(surveyValue)
            }
        }

        this.lastSurvey =
            surveyDates.length > 0
                ? surveyDates.reduce((pr, cu) => {
                      return cu > pr ? cu : pr
                  })
                : null

        // clone
        this.originalTags = cloneDeep(this.tags)
    }

    ngOnInit() {
        // override
        this.initComponent()
        // console.log(this.mapService.isProcessing.getValue())

        this.cdr.detectChanges()

        if (this.mode === 'Create') {
            this.openPrimaryTagModal()
        }
    }

    presentConfirm() {
        this.alertCtrl
            .create({
                header: this.translate.instant(
                    'MODAL_SELECTED_ITEM.DELETE_CONFIRM_HEADER'
                ),
                message: this.translate.instant(
                    'MODAL_SELECTED_ITEM.DELETE_CONFIRM_MESSAGE'
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
                            this.deleteOsmElement()
                        },
                    },
                ],
            })
            .then((alert) => {
                alert.present()
            })
    }

    initComponent(tagConfig: TagConfig = null) {
        let _tags = [...this.tags]
        let feature = cloneDeep(this.feature)
        let _tagConfig: TagConfig
        let _tagId
        let _presetsIds: string[]
        let _savedFields
        let _primaryKey

        _primaryKey = this.tagsService.findPkey(_tags)

        feature.properties.primaryTag = _primaryKey
        // this.feature.properties.primaryTag = this.primaryKey
        // Edit, Read, Loading
        this.typeFiche =
            this.mode === 'Update' || this.mode === 'Create' ? 'Edit' : 'Read' // ?

        _tags = _tags.filter(
            (tag) => tag.value && tag.value !== '' && !tag.isDefaultValue
        )
        if (!_tags.find((tag) => tag.key === 'name')) {
            // on ajoute un nom vide si il n'existe pas
            _tags.push({ key: 'name', value: '' })
        }

        // la configuration pour cette clé principale (lbl, icon, presets[], ...)
        if (!tagConfig) {
            _tagConfig = getConfigTag(feature, this.tagsService.tags)
        } else {
            _tagConfig = tagConfig
        }

        _tagId =
            _tagConfig && _tagConfig.id
                ? _tagConfig.id
                : `${_primaryKey.key}/${_primaryKey.value}`
        // this.tagId = this.tagConfig && this.tagConfig.id ? this.tagConfig.id : `${this.primaryKey.key}/${this.primaryKey.value}`;
        _savedFields = this.tagsService.savedFields[_tagId]
        this.savedFields = _savedFields

        // this.presetsIds = (this.tagConfig && this.tagConfig.presets) ? this.tagConfig.presets : undefined;
        _presetsIds =
            _tagConfig && _tagConfig.presets ? _tagConfig.presets : undefined

        if (_presetsIds && _presetsIds.length > 0) {
            // on ajoute les presets manquant aux données 'tags' (chaine vide); + ajout 'name' si manquant
            for (let i = 0; i < _presetsIds.length; i++) {
                const preset: Preset = this.tagsService.presets[_presetsIds[i]]

                // le tag utilisant la clé du preset
                const tagOfPreset: Tag =
                    _tags.find((tag) => tag.key === preset.key) || undefined

                if (tagOfPreset) {
                    tagOfPreset['preset'] = preset // on met la config du prset direct dans le "tag" => key, value, preset[]
                } else {
                    // => un le tag avec la key du preset n'existe pas, on l'insert vide
                    _tags.push({ key: preset.key, value: '', preset: preset })
                }
            }
        }

        this.tagId = _tagId
        this.feature = feature
        this.tags = _tags
        this.presetsIds = _presetsIds
        this.tagConfig = _tagConfig
        this.primaryKey = _primaryKey
        return { tagConfig: _tagConfig, tags: _tags, feature: feature }
    }

    dataIsChanged() {
        const tagsNotNull = []
        for (let i = 0; i < this.tags.length; i++) {
            if (this.tags[i].value) {
                tagsNotNull.push({
                    key: this.tags[i].key,
                    value: this.tags[i].value,
                })
            }
        }

        const originalTagsNotNull = []
        for (let i = 0; i < this.originalTags.length; i++) {
            if (
                this.originalTags[i].value &&
                this.originalTags[i].value !== ''
            ) {
                originalTagsNotNull.push({
                    key: this.originalTags[i].key,
                    value: this.originalTags[i].value,
                })
            }
        }

        if (isEqual(tagsNotNull, originalTagsNotNull)) {
            return false
        }
        return true
    }

    updateMode() {
        this.zone.run(() => {
            this.mode = 'Update'
            this.typeFiche = 'Edit'
        })
    }

    toogleCode() {
        // affiche les tags originaux
        this.zone.run(() => {
            this.displayCode = this.displayCode ? false : true
        })
    }

    addNewKey(key) {
        // Check if the key already exists in presets
        if (this.tags.find((t) => t.key == key)) {
            return
        }

        const genericPreset = this.tagsService.presets[key]
        if (!genericPreset) {
            this.tags = [
                ...this.tags,
                { key: key, value: '', isJustAdded: true },
            ]
        } else {
            this.tags = [
                ...this.tags,
                {
                    key: key,
                    value: '',
                    preset: genericPreset,
                    isJustAdded: true,
                },
            ]
        }
    }

    deleteTag(tag) {
        const idx = findIndex(this.tags, { key: tag.key })
        if (idx !== -1) {
            this.tags.splice(idx, 1)
        }
    }

    toLowerCase(text: string) {
        return text.toLowerCase()
    }

    // renvoie l'élément du tableau correspondant  || TODO => pipe
    findElement(array, kv) {
        // {'user': 'fred'}
        const idx = findIndex(array, kv)
        if (idx !== -1) {
            return array[idx]
        }
        return null
    }

    dismiss(data: ModalDismissData = null) {
        this.modalCtrl.dismiss(data)
    }

    createOsmElement(tagconfig) {
        this.mapService.setIsProcessing(true)

        this.typeFiche = 'Loading'
        this.tagsService.addTagTolastTagsUsed(tagconfig.id)

        if (this.configService.getAddSurveyDate()) {
            this.addSurveyDate()
        }

        this.pushTagsToFeature() // on pousse les tags dans la feature
        this.osmApi.createOsmNode(this.feature).subscribe({
            next: (data) => {
                this.dismiss({ redraw: true })
            },
            complete: () => {
                this.mapService.setIsProcessing(false)
            },
        })
    }

    updateOsmElement(tagconfig) {
        this.mapService.setIsProcessing(true)
        this.typeFiche = 'Loading'

        this.tagsService.addTagTolastTagsUsed(tagconfig ? tagconfig.id : null)
        // si les tags et la position n'ont pas changé, on ne fait rien!
        if (!this.dataIsChanged() && !this.newPosition) {
            this.mapService.setIsProcessing(false)
            this.dismiss()
            return
        }

        if (this.configService.getAddSurveyDate()) {
            this.addSurveyDate()
        }

        this.pushTagsToFeature() // on pousse les tags dans la feature

        this.osmApi.updateOsmElement(this.feature, this.origineData).subscribe({
            next: (data) => {
                this.dismiss({ redraw: true })
            },
            complete: () => {
                this.mapService.setIsProcessing(false)
            },
        })
    }

    deleteOsmElement() {
        this.mapService.setIsProcessing(true)
        this.typeFiche = 'Loading'
        this.osmApi.deleteOsmElement(this.feature).subscribe({
            next: (data) => {
                this.dismiss({ redraw: true })
            },
            complete: () => {
                this.mapService.setIsProcessing(false)
            },
        })
    }

    pushTagsToFeature() {
        const tagObjects = {}
        for (let i = 0; i < this.tags.length; i++) {
            tagObjects[this.tags[i].key] = this.tags[i].value
        }
        this.feature.properties.tags = tagObjects
    }

    moveOsmElement() {
        this.pushTagsToFeature()
        // on ferme la modal
        this.dismiss({ type: 'Move', geojson: this.feature, mode: this.mode })
    }

    async openPrimaryTagModal() {
        const modal = await this.modalCtrl.create({
            component: ModalPrimaryTag,
            componentProps: {
                geojson: this.feature,
                tagConfig: this.tagConfig,
                tags: this.tags,
                geometryType: this.geometryType,
            },
        })
        await modal.present()
        modal.onDidDismiss().then((d) => {
            const newTagConfig = d.data
            const oldTagConfig = this.tagConfig
            const oldKeyTagsToDelete = Object.keys(oldTagConfig.tags)
            let copyTags = cloneDeep(this.tags)
            copyTags = copyTags.filter(
                (t) => !oldKeyTagsToDelete.includes(t.key)
            )

            for (let t of copyTags) {
                if (t.preset) {
                    delete t.preset
                }
            }
            if (!newTagConfig) {
                this.cdr.detectChanges()
                return
            }
            const newTagsKeys = Object.keys(newTagConfig.tags)
            let newTagsToAdd = []
            for (let k in newTagConfig.tags) {
                newTagsToAdd = [
                    { key: k, value: newTagConfig.tags[k] },
                    ...newTagsToAdd,
                ]
            }

            copyTags = copyTags.filter((ct) => !newTagsKeys.includes(ct.key))
            copyTags = [...newTagsToAdd, ...copyTags]

            if (newTagConfig.addTags) {
                copyTags = this.addTags(newTagConfig.addTags, copyTags)
            }

            this.tags = [...copyTags]
            this.initComponent(newTagConfig)
            this.cdr.detectChanges()
        })
    }

    async openModalList(data, preset) {
        if (preset) {
            data['preset'] = preset
        }

        const modal = await this.modalCtrl.create({
            component: ModalSelectList,
            componentProps: data,
        })
        await modal.present()

        modal.onDidDismiss().then((d) => {
            const _data = d.data
            if (_data) {
                this.tags.filter((tag) => tag.key === _data.key)[0].value =
                    _data.value
                if (_data.tags) {
                    // add or remplace tags...
                    this.tags = this.addTags(_data.tags, this.tags)
                    this.initComponent(this.tagConfig)
                }
            }
            this.cdr.detectChanges()
        })
    }

    async openModalAddTag() {
        const modal = await this.modalCtrl.create({
            component: ModalAddTag,
            componentProps: {
                moreFields: this.tagConfig.moreFields || [],
                usedList: [
                    ...this.tagConfig.presets,
                    ...this.tags.map((e) => e.key),
                ],
            },
        })
        await modal.present()

        modal.onDidDismiss().then((d) => {
            const newTag = d.data
            if (!newTag) return

            this.addNewKey(newTag)
            this.cdr.detectChanges()
        })
    }

    //  add or remplace tags [] from tags {}
    addTags(newTags, existingTags) {
        let _existingTags = [...existingTags]
        for (let t in newTags) {
            const tagIndex = _existingTags.findIndex((o) => o.key == t)
            if (tagIndex !== -1) {
                _existingTags[tagIndex] = { key: t, value: newTags[t] }
            } else {
                _existingTags = [
                    ..._existingTags,
                    { key: t, value: newTags[t] },
                ]
            }
        }
        return _existingTags
    }

    addPresetsTags(newTags) {
        if (newTags) {
            this.tags = this.addTags(newTags, this.tags)
            this.initComponent(this.tagConfig)
        }
        this.cdr.detectChanges()
    }

    cancelChange() {
        this.dataService.cancelFeatureChange(this.feature)
        this.dismiss({ redraw: true })
    }
    async presentToast(message) {
        const toast = await this.toastCtrl.create({
            message: message,
            duration: 4000,
            position: 'bottom',
            buttons: [
                {
                    text: 'X',
                    role: 'cancel',
                    handler: () => {},
                },
            ],
        })
        toast.present()

        // this.toastCtrl.create({
        //   message: message,
        //   duration: 5000,
        //   showCloseButton: true,
        //   closeButtonText: 'X'
        // }).then(toast => {
        //   toast.present();
        // });
    }

    confirmAddSurveyDate() {
        this.alertCtrl
            .create({
                header: this.translate.instant(
                    'MODAL_SELECTED_ITEM.ADD_SURVEY_DATE_CONFIRM_HEADER'
                ),
                subHeader: this.translate.instant(
                    'MODAL_SELECTED_ITEM.ADD_SURVEY_DATE_CONFIRM_MESSAGE'
                ),
                buttons: [
                    {
                        text: this.translate.instant('SHARED.NO'),
                        role: 'cancel',
                        handler: (data) => {},
                    },
                    {
                        text: this.translate.instant('SHARED.YES'),
                        handler: (data) => {
                            this.addSurveyDate()
                            this.updateOsmElement(null)
                        },
                    },
                ],
            })
            .then((alert) => {
                alert.present()
            })
    }

    generateISODate(date: Date) {
        const YYYY = date.getFullYear()
        const MM =
            date.getMonth() + 1 < 10
                ? '0' + (date.getMonth() + 1)
                : '' + (date.getMonth() + 1)
        const DD =
            date.getDate() < 10 ? '0' + date.getDate() : '' + date.getDate()
        return YYYY + '-' + MM + '-' + DD
    }

    shouldShowSurveyCard() {
        const display = this.configService.getDisplaySurveyCard()
        const today = new Date()
        if (display == 'never') return false
        if (!this.lastSurvey) return true
        if (
            this.generateISODate(this.lastSurvey) == this.generateISODate(today)
        )
            return false
        if (display == 'always') return true

        const OneYear = 31536000000
        const maxYearAgo = this.configService.getSurveyCardYear()

        return (
            this.lastSurvey.getTime() < today.getTime() - OneYear * maxYearAgo
        )
    }

    handleSurveyYes() {
        this.addSurveyDate()
        this.updateOsmElement(null)
    }

    async handleSurveyNo() {
        // TODO: Ask if closed, disused or not existant
        if (this.feature.properties.type == 'node') {
            this.presentConfirm()
        }
    }

    addSurveyDate() {
        const isoDate = this.generateISODate(new Date())

        let tagSurveyIndex = -1
        for (let i = 0; i < this.tags.length; i++) {
            if (this.tags[i].key === this.configService.config.checkedKey) {
                tagSurveyIndex = i
                break
            }
        }
        if (tagSurveyIndex !== -1) {
            // le tag existe déjà, on l'écrase
            this.tags[tagSurveyIndex].value = isoDate
        } else {
            this.tags.push({
                key: this.configService.config.checkedKey,
                value: isoDate,
            })
        }

        // Remove old check tags
        const possibleCheckedKeys = ['survey:date', 'check_date']
        for (let i = 0; i < this.tags.length; i++) {
            const key = this.tags[i].key
            if (
                key !== this.configService.config.checkedKey &&
                possibleCheckedKeys.includes(key)
            ) {
                this.tags.splice(i, 1)
                i--
            }
        }
    }

    saveFields(tagId, tags) {
        const savedTags = tags
            .map((t) => {
                return { key: t.key, value: t.value }
            })
            .filter((t) => t.key !== 'name')
            .filter((t) => t.key !== 'survey:date')
            .filter((t) => t.key !== 'check_date')
        this.tagsService.addSavedField(tagId, savedTags)
        if (!this.savedFields) this.savedFields = {}
        this.savedFields['tags'] = [...savedTags]
    }

    restoreFields(tagId, tags) {
        const fields = this.tagsService.savedFields[tagId]
        const newTags = [...tags]
        if (fields) {
            for (let stags of fields.tags) {
                let t = newTags.find((o) => o.key === stags.key)
                if (t) {
                    t['value'] = stags.value
                } else {
                    newTags.push(stags)
                }
            }
        }
        this.tags = [...newTags]
        this.initComponent(this.tagConfig)
        this.cdr.detectChanges()
    }

    fixDeprecated(deprecated: any) {
        const deprecadetKeys = Object.keys(deprecated.old)
        // delete old tags
        this.tags = this.tags.filter((t) => !deprecadetKeys.includes(t.key))

        for (let depold of deprecadetKeys) {
            if (this.feature.properties[depold]) {
                delete this.feature.properties[depold]
            }
        }
        this.feature.properties.tags = {
            ...this.feature.properties.tags,
            ...deprecated.replace,
        }
        // add new
        for (let k in deprecated.replace) {
            this.tags = [{ key: k, value: deprecated.replace[k] }, ...this.tags]
        }

        if (this.mode !== 'Update') {
            this.mode = 'Update'
            this.typeFiche = 'Edit'
        }

        this.initComponent()
        this.cdr.detectChanges()
    }

    addOrRemoveBookmark(tag: TagConfig) {
        if (!this.tagsService.bookmarksIds.includes(tag.id)) {
            this.tagsService.addBookMark(tag)
        } else {
            this.tagsService.removeBookMark(tag)
        }
        this.cdr.detectChanges()
    }
}
