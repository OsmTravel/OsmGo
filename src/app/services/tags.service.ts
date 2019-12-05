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
    lastTagAdded: TagConfig[];
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

    setBookMarksIds(bookmarksIds: string[]) {
        this.localStorage.set('bookmarksIds', bookmarksIds);
        this.bookmarksIds = bookmarksIds;
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
    // addRemoveBookMark(tagId: string) {
    //     let ind = -1;
    //     for (let i = 0; i < this.bookMarks.length; i++) {
    //         if (this.bookMarks[i].key === tag.key && this.bookMarks[i].primaryKey === tag.primaryKey) {
    //             ind = i;
    //         }
    //     }

    //     if (ind === -1) {
    //         this.bookMarks.push(tag);
    //     } else {
    //         this.bookMarks.splice(ind, 1);
    //     }
    //     this.localStorage.set('bookMarks', this.bookMarks);
    // }

    getTagConfigFromTagsID( tagIds:string[]){
        return this.tags.filter( tag => tagIds.includes(tag.id))
    }

    getBookMarksIdsFromStorage$() {
        return from(this.localStorage.get('bookmarksIds'))
    }


    // LastTagAdded
    getLastTagAdded() :TagConfig[] {
        return this.lastTagAdded;
    }
    addTagToLastTagAdded(tagconfig: TagConfig) {
        if (!tagconfig){
            return;
        }
        if (!this.lastTagAdded || !Array.isArray( this.lastTagAdded)){
            this.lastTagAdded = [];
        }
        const index = this.lastTagAdded.findIndex( o => o.id == tagconfig.id) 
        if (index !== -1){
            this.lastTagAdded.splice(index, 1);
        }
        this.lastTagAdded = [tagconfig, ... this.lastTagAdded].slice(0,20);
        console.log('setLastTag', this.lastTagAdded)
        this.localStorage.set('lastTagAdded', this.lastTagAdded);
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

    loadLastTagAdded$() {
        return from(this.localStorage.get('lastTagAdded')).pipe(
            map(d => {
                if (d) {
                    this.lastTagAdded = d;
                } else {
                    this.lastTagAdded = null;
                }
                return d
            })
        );
    }




    getPrimaryKeys() {
        return this.primaryKeys;
    }

    
  findPkey( featureOrTags): PrimaryTag{
    const pkeys = this.primaryKeys;
    console.log(this.primaryKeys);
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

    getAllTags(): Observable<any> { 
        return this.http.get(`assets/tags&presets/tags.json`)
            .pipe(
                map(res => {
                    this.tags = res['tags'];;
                    this.primaryKeys = res['primaryKeys'];
                    console.log(this.primaryKeys);
                    this.excludeWays = res['excludeWays'];
                    return res['tags'];
                })
            );
    }

    // getTagConfigByKeyValue(key, value) {
    //     const filtered = this.tags[key].values.filter(elem => elem.key === value);
    //     if (filtered.length > 0) {
    //         return filtered[0];
    //     } else {
    //         return undefined;
    //     }
    // }


    getTags() {
        return cloneDeep(this.tags);
    }

    // getFullTags() {
    //     const res = [];
    //     const tags = this.getTags();
    //     for (const tagsObject in tags) {
    //         for (let i = 0; i < tags[tagsObject].values.length; i++) {
    //             const currentTag = cloneDeep(tags[tagsObject].values[i]);
    //             res.push(currentTag);
    //         }
    //     }
    //     return res;
    // }

    getBaseMaps() {
        return this.http.get(`assets/tags&presets/basemap.json`)
            .pipe(
                map((p) => {
                    this.configService.baseMapSources = p;
                    return this.basemaps;
                })
            );
    }

    loadPresets() {
        return this.http.get(`assets/tags&presets/presets.json`)
            .pipe(
                map((p) => { 
                    const json = p;
                    for (const k in json) {
                        json[k]['_id'] = k;
                    }
                    this.presets = json;
                    return this.presets;
                })
            );
    }

    loadJsonSprites$() {
        console.log('JSON SPRITES')
        const devicePixelRatio =  Math.round(window.devicePixelRatio);
        return this.http.get('assets/iconsSprites@x'+devicePixelRatio+'.json')
          .pipe(
            map( (jsonSprites) => {
                this.jsonSprites = jsonSprites
                return this.jsonSprites;
            })
          )
      }

    loadTagsAndPresets$() {
        return forkJoin(
            this.loadJsonSprites$(),
            this.loadPresets(),
            this.getAllTags(),
            this.getBaseMaps(),
            this.getBookMarksIdsFromStorage$()
        )
        .pipe(
            map( ([jsonsprites, presets, tags, baseMaps, bookmarksIds]) => {
                // console.log(jsonsprites, presets, tags, bookmarksIds);
                console.log('llllllla', bookmarksIds)
                // console.log(bookmarksIds);
                    if (bookmarksIds) {
                        this.bookmarksIds = bookmarksIds
                        console.log(this.bookmarksIds)
                        this.bookMarks = this.getTagConfigFromTagsID(bookmarksIds);
                        console.log(this.bookMarks );
                    } else {
                        this.bookMarks = [];
                        this.bookmarksIds = []
                    }
                  
              

            } )
        )
    }


    getPresetsById(id) {
        return this.presets[id];
    }

   
    getPresetsOptionFromJson(jsonPath){
            return this.http.get<PresetOption[]>(`assets/${jsonPath}`)
                .pipe(
                    map((res) => {
                        return res;
                    })
                )
    }



    // liste des clés principales => ["shop", "amenity", "public_transport", "emergency",...]
    getListOfPrimaryKey() {
        const tags = this.tags;
        const listeOfPrimaryKey = [];
        for (const key in tags) {
            listeOfPrimaryKey.push(key);
        }
        return listeOfPrimaryKey;
    }

    getPrimaryKeyOfObject(feature) {
        const tags = feature.properties.tags;
        const types_liste = this.getListOfPrimaryKey();
        let kv = { k: '', v: '' };
        for (const k in tags) {
            // console.log(k);
            if (types_liste.indexOf(k) !== -1) {
                // on filtre ici pour ne pas prendre en compte les ways exclus
                if ((feature.properties.type === 'way' || feature.properties.type === 'relation')
                    && this.tags[k].exclude_way_values
                    && this.tags[k].exclude_way_values.indexOf(tags[k]) !== -1
                ) {
                    continue;
                }
                kv = { k: k, v: tags[k] };
                // console.log(kv)
                return kv;
            }
        }
        return null;
    }

}
