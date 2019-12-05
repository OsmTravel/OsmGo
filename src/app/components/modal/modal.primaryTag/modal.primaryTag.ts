import { Component, OnInit } from '@angular/core';
import { ModalController, Platform, NavParams } from '@ionic/angular';
import { TagsService } from '../../../services/tags.service';
import { ConfigService } from '../../../services/config.service';
import { TagConfig } from '../../../../type'

@Component({
    selector: 'modal-primary-tag',
    templateUrl: './modal.primaryTag.html',
    styleUrls: ['./modal.primaryTag.scss']
})
export class ModalPrimaryTag implements OnInit {
    selectedKey: string;
    tagsOfselectedKey;
    loading = true;
    primaryKeys = [];
    allTags: TagConfig[];
    searchText = '';
    currentListOfTags: TagConfig[] = [];
    typeFiche = 'list';
    customValue = '';
    oldTagConfig: TagConfig;
    geometriesPossible:string[] = []
    displayType = 'lastTags'


    constructor(
        public params: NavParams,
        public modalCtrl: ModalController,
        public tagsService: TagsService,
        // public platform: Platform,
        public configService: ConfigService


    ) {
        this.oldTagConfig = this.params.data.tagConfig

    }

    ngOnInit() {
        const typeGeomFeature = this.params.data.geojson.geometry.type;
        const usedByWay = this.params.data.geojson.properties.usedByWays ? true : false
        if (typeGeomFeature === 'Point' && !usedByWay){
            this.geometriesPossible =  [...this.geometriesPossible, 'point']
        } else if (typeGeomFeature === 'Point' && usedByWay){
                this.geometriesPossible =  [...this.geometriesPossible, 'vertex']
        } else if( typeGeomFeature === 'Polyline' || typeGeomFeature === 'MultiPolyline' ){
            this.geometriesPossible =  [...this.geometriesPossible, 'line']
        } else if( typeGeomFeature === 'Polygon' || typeGeomFeature === 'MultiPolygon' ){
            this.geometriesPossible =  [...this.geometriesPossible, 'area']
        }
     
        this.currentListOfTags = this.tagsService.tags;
        this.loading = false;
    }

    dismiss(data = null) {
        this.modalCtrl.dismiss(data);
    }

    summit(data) {
        this.dismiss(data);
    }
    cancel() {
        this.dismiss();
    }

    selected(config) {
        this.summit(config);
    }

    addBookmark(tag){
        this.tagsService.addBookMark(tag.id)
    }
    removeBookmark(tag){
        this.tagsService.removeBookMark(tag.id)
    }


    // updateSelectedValue(key) {
    //     if (key === 'full') {
    //         this.currentListOfTags = this.tagsService.getFullTags();
    //     } else if (key === 'bookmarks') {
    //         this.currentListOfTags = this.tagsService.getBookMarks();
    //     }
    // }

    addCustomValue(key, value){
        const newConfig = {
            icon: "",
            id: `${key}/${value}`,
            key: value,
            presets: [],
            primaryKey: key,
            tags: {}
        }
        newConfig.tags[key]= value;

        this.summit(newConfig);

    }
}
