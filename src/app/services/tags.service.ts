import { HttpClient } from '@angular/common/http';
import { Observable, from, forkJoin } from 'rxjs';
import { map} from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { ConfigService } from './config.service';
import { cloneDeep } from 'lodash';
import { PresetOption, PrimaryTag, TagConfig } from "../../type";

@Injectable({ providedIn: 'root' })
export class TagsService {
    lastTagsUsed: TagConfig[];
    lastTagsUsedIds: string[];

    bookMarks:TagConfig[] = []
    bookmarksIds: string[] = [];
    savedFields = {};
    tags:TagConfig[];
    primaryKeys = [];
    excludeWays= {};
    presets = {};

    basemaps;
    jsonSprites


    constructor(private http: HttpClient,
        public localStorage: Storage,
        public configService: ConfigService) {
    }

    // bookMarks
    getBookMarks():TagConfig[] {
        return this.bookMarks;
    }

    
    getTagConfigFromTagsID( tagIds:string[]){
        return this.tags.filter( tag => tagIds.includes(tag.id))
    }


    setBookMarksIds(bookmarksIds: string[]) {
        this.localStorage.set('bookmarksIds', bookmarksIds);
        this.bookmarksIds = bookmarksIds;
    }

    setLastTagsUsedIds(lastTagsUsedIds: string[]){
        this.localStorage.set('lastTagsUsedIds', lastTagsUsedIds);
        this.lastTagsUsedIds = lastTagsUsedIds;
    }

    removeBookMark( tagId: string ){
        this.bookmarksIds = this.bookmarksIds.filter( b => b !== tagId);
        this.bookMarks = this.bookMarks.filter( b => b.id !== tagId);
        this.setBookMarksIds(this.bookmarksIds)
    }

    addBookMark(tagId: string){
        if (this.bookmarksIds.includes(tagId)){
            return;
        }
        let currentTag = this.tags.find( t => t.id === tagId);
        if (!currentTag){
            return;
        }
        this.bookmarksIds = [...this.bookmarksIds , tagId];
        this.bookMarks = [...this.bookMarks, currentTag]

        this.setBookMarksIds(this.bookmarksIds)
        return currentTag;
    }

    getBookMarksIdsFromStorage$() {
        return from(this.localStorage.get('bookmarksIds'))
    }

    getlastTagsUsedIdsFromStorage$(){
        return from(this.localStorage.get('lastTagsUsedIds'))
    }


    addTagTolastTagsUsed(tagId: string) {
        if (this.lastTagsUsedIds.includes(tagId)){
            this.lastTagsUsedIds = this.lastTagsUsedIds.filter( tu => tu !== tagId);
            this.lastTagsUsed = this.lastTagsUsed.filter(tu => tu.id !== tagId)  
        }
        let currentTag = this.tags.find( t => t.id === tagId);
        if (!currentTag){
            return;
        }

        this.lastTagsUsedIds = [...this.lastTagsUsedIds , tagId].slice(0,20);
        this.lastTagsUsed = [...this.lastTagsUsed, currentTag].slice(0,20)

        this.setLastTagsUsedIds(this.lastTagsUsedIds)
        return currentTag;
    }


    loadSavedFields$() {
        return from(this.localStorage.get('savedFields'))
            .pipe(
                map(d => {
                    if (d) {
                        this.savedFields = d;
                    } else {
                        this.savedFields = {};
                    }
                    return this.savedFields;
                })
            )
    }

    addSavedField(tagId, tags){
        console.log(this.savedFields);
        if (!this.savedFields[tagId]){
            this.savedFields[tagId] = {};
        }
        this.savedFields[tagId]['tags'] = tags
        // .tags = tags;
        this.localStorage.set('savedFields', this.savedFields);
    }


  findPkey( featureOrTags): PrimaryTag{
    const pkeys = this.primaryKeys;
    if (featureOrTags.properties && featureOrTags.properties.tags){
        for (let k in featureOrTags.properties.tags){
            if (pkeys.includes(k)){
                return {key: k, value:featureOrTags.properties.tags[k] }
            }
            return undefined
        }
    } else {
        for (let t of featureOrTags){
            if (pkeys.includes(t.key)){
                return {key: t.key, value:t.value }
            }
        }
        return undefined
    }

} 

    getTagsConfig$(): Observable<any> { 
        return this.http.get(`assets/tags&presets/tags.json`)
    }

    getBaseMaps$() {
        return this.http.get(`assets/tags&presets/basemap.json`)
    }

    getPresets$() {
        return this.http.get(`assets/tags&presets/presets.json`)
            .pipe(
                map((p) => { 
                    const json = p;
                    for (const k in json) {
                        json[k]['_id'] = k;
                    }
                   return json;
                })
            );
    }

    getJsonSprites$() {
        const devicePixelRatio =  Math.round(window.devicePixelRatio);
        return this.http.get('assets/iconsSprites@x'+devicePixelRatio+'.json')
      }

    loadTagsAndPresets$() {
        return forkJoin(
            this.getJsonSprites$(),
            this.getPresets$(),
            this.getTagsConfig$(),
            this.getBaseMaps$(),
            this.getBookMarksIdsFromStorage$(),
            this.getlastTagsUsedIdsFromStorage$()
        )
        .pipe(
            map( ([jsonSprites, presets, tagsConfig, baseMaps, bookmarksIds, lastTagsUsedIds]) => {

                this.jsonSprites = jsonSprites;
                this.presets = presets;
                this.tags = tagsConfig['tags'];;
                this.primaryKeys = tagsConfig['primaryKeys'];
                this.excludeWays = tagsConfig['excludeWays'];
                this.configService.baseMapSources = baseMaps;
        
                    if (bookmarksIds) {
                        this.bookmarksIds = bookmarksIds
                        this.bookMarks = this.getTagConfigFromTagsID(bookmarksIds);
                    } else {
                        this.bookMarks = [];
                        this.bookmarksIds = []
                    }

                    if (lastTagsUsedIds){
                        this.lastTagsUsedIds = lastTagsUsedIds;
                        this.lastTagsUsed =  this.getTagConfigFromTagsID(lastTagsUsedIds);
                    } else {
                        this.lastTagsUsedIds = [];
                        this.lastTagsUsed =  [];
                    }
                  
              

            } )
        )
    }
}
