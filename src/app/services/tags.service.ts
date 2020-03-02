import { HttpClient } from '@angular/common/http';
import { Observable, from, forkJoin } from 'rxjs';
import { map} from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { ConfigService } from './config.service';
import { PresetOption, PrimaryTag, TagConfig } from "../../type";

@Injectable({ providedIn: 'root' })
export class TagsService {
    lastTagsUsedIds: string[];

    bookmarksIds: string[] = [];
    savedFields = {};
    tags:TagConfig[];
    userTags:TagConfig[];
    primaryKeys = [];
    presets = {};
    hiddenTagsIds: string[];

    basemaps;
    jsonSprites


    
    defaultHiddenTagsIds :string[] = [
        'highway/pedestrian_area',
        'highway/footway',
        'highway/motorway',
        'highway/trunk',
        'highway/trunk_link',
        'highway/primary',
        'highway/primary_link',
        'highway/secondary',
        'highway/secondary_link',
        'highway/tertiary',
        'highway/tertiary_link',
        'highway/unclassified',
        'highway/residential',
        'highway/service',
        'highway/motorway_link',
        'highway/living_street',
        'highway/track',
        'highway/bus_guideway',
        'highway/road',
        'highway/bridleway',
        'highway/path',
        'highway/cycleway',
        'highway/construction',
        'highway/steps',
        'highway/motorway_junction',
        'highway/corridor',
        'highway/pedestrian_line',
        'highway/cycleway/bicycle_foot',
        'highway/footway/crossing',
        'highway/service/parking_aisle',
        'highway/service/driveway',
        'highway/path/informal',
        'highway/stop',
        'highway/turning_circle',

        'railway/platform',
        'railway/abandoned',
        'railway/construction',
        'railway/disused',
        'railway/funicular',
        'railway/light_rail',
        'railway/miniature',
        'railway/monorail',
        'railway/narrow_gauge',
        'railway/rail',
        'railway/rail/highspeed',
        'railway/subway',
        'railway/tram',
        'railway/tram_level_crossing',
        'railway/tram_crossing',
        'railway/railway_crossing',

        'barrier/kerb',
        'barrier/kerb/flush',
        'barrier/kerb/lowered',
        'barrier/kerb/raised',
        'barrier/kerb/rolled',

        'natural/grassland',
        'natural/wood',
        'natural/bare_rock',
        'natural/cliff',
        'natural/shingle',
        'natural/coastline',

        'waterway/riverbank',
        'waterway/canal',
        'waterway/canal/lock',
        'waterway/ditch',
        'waterway/drain',
        'waterway/fish_pass',
        'waterway/river',
        'waterway/stream_intermittent',
        'waterway/stream',
        'waterway/tidal_channel',

        'man_made/bridge',

        'building/yes',
        'building/train_station',
        'building/apartments',
        'building/barn',
        'building/boathouse',
        'building/bungalow',
        'building/cabin',
        'building/carport',
        'building/cathedral',
        'building/chapel',
        'building/church',
        'building/civic',
        'building/college',
        'building/commercial',
        'building/construction',
        'building/detached',
        'building/dormitory',
        'building/farm_auxiliary',
        'building/farm',
        'building/garage',
        'building/garages',
        'building/grandstand',
        'building/greenhouse',
        'building/hangar',
        'building/hospital',
        'building/hotel',
        'building/house',
        'building/houseboat',
        'building/hut',
        'building/industrial',
        'building/kindergarten',
        'building/mosque',
        'building/pavilion',
        'building/public',
        'building/residential',
        'building/retail',
        'building/roof',
        'building/ruins',
        'building/school',
        'building/semidetached_house',
        'building/service',
        'building/shed',
        'building/stable',
        'building/stadium',
        'building/static_caravan',
        'building/temple',
        'building/terrace',
        'building/transportation',
        'building/university',
        'building/warehouse',
        'building/office'
    ]


    constructor(private http: HttpClient,
        public localStorage: Storage,
        public configService: ConfigService) {
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

    removeBookMark( tag: TagConfig ){
        this.bookmarksIds = this.bookmarksIds.filter( b => b !== tag.id);
        this.setBookMarksIds(this.bookmarksIds)
    }

    addBookMark(tag: TagConfig){
        if (this.bookmarksIds.includes(tag.id)){
            return;
        }
        let currentTag = this.tags.find( t => t.id === tag.id);
        if (!currentTag){
            this.addUserTags(tag)
        }
        this.bookmarksIds = [tag.id, ...this.bookmarksIds ];

        this.setBookMarksIds(this.bookmarksIds)
        // TODO : si tag inconnu => ajouter à userTag
        return currentTag;
    }

    loadBookMarksIds$() {
        return from(this.localStorage.get('bookmarksIds'))
            .pipe( 
                map( bookmarksIds => {
                    bookmarksIds = bookmarksIds ? bookmarksIds : []
                    this.bookmarksIds = bookmarksIds
                    return bookmarksIds
                })
            )
    }

    // hidden tags
    loadHiddenTagsIds$() {
        return from(this.localStorage.get('hiddenTagsIds'))
        .pipe(
            map( hiddenTagsIds => {
                hiddenTagsIds = hiddenTagsIds ? hiddenTagsIds : [...this.defaultHiddenTagsIds];
                this.hiddenTagsIds  = hiddenTagsIds;
                return hiddenTagsIds;
            })
        )
    }

    setHiddenTagsIds(hiddenTagsIds: string[]) {
        this.localStorage.set('hiddenTagsIds', hiddenTagsIds);
        this.hiddenTagsIds = hiddenTagsIds;
    }

    removeHiddenTag(tag:TagConfig){
        if(!tag.id){
          return;
        }
        const newHiddenTags = this.hiddenTagsIds.filter(t => t !== tag.id)
        this.setHiddenTagsIds(newHiddenTags)
      }

    addHiddenTag(tag:TagConfig){ // => hide a tag
        if(!tag.id){
          return;
        }
        if (!this.hiddenTagsIds.includes(tag.id)){
            const newHiddenTags = [tag.id, ...this.hiddenTagsIds]
            this.setHiddenTagsIds(newHiddenTags)
            // delete bookmark...
            this.removeBookMark(tag)
        }
      }
    
    resetHiddenTags(){
        const defaultHiddenTagsIds = [...this.defaultHiddenTagsIds];
        this.setHiddenTagsIds(defaultHiddenTagsIds) 
      }

    loadLastTagsUsedIds$(){
        return from(this.localStorage.get('lastTagsUsedIds'))
        .pipe(
            map( lastTagsUsedIds => {
                lastTagsUsedIds = lastTagsUsedIds ? lastTagsUsedIds : [];
                this.lastTagsUsedIds = lastTagsUsedIds;
                return lastTagsUsedIds;
            })
        )
    }


    addTagTolastTagsUsed(tagId: string) {
        if (!tagId){
            return;
        }
        if (this.lastTagsUsedIds.includes(tagId)){
            this.lastTagsUsedIds = this.lastTagsUsedIds.filter( tu => tu !== tagId);
        }
        let currentTag = this.tags.find( t => t.id === tagId);
        if (!currentTag){
            return;
        }

        this.lastTagsUsedIds = [tagId, ...this.lastTagsUsedIds].slice(0,20);

        this.setLastTagsUsedIds(this.lastTagsUsedIds)
        return currentTag;
    }

    loadUserTags$(){
        return from( this.localStorage.get('userTags'))
        .pipe(
            map( userTags => {
                userTags = userTags ? userTags : [];
                this.userTags = userTags;
                return userTags;
            })
        )
    }

    setUserTags(userTags: TagConfig[]) {
        this.localStorage.set('userTags', userTags);
        this.userTags = userTags;
    }

    addUserTags(newTag: TagConfig){
        const newTagId = newTag.id;
        if (this.userTags.find( t => t.id === newTagId)){
            return;
        }
        newTag['geometry'] = ['point', 'vertex', 'line', 'area']
        newTag['icon'] = "maki-circle-custom",
        newTag['markerColor'] = "#000000";
        this.userTags =  [...this.userTags, newTag]
        this.tags = [...this.tags, newTag ]
        this.setUserTags(this.userTags)
    }


    loadSavedFields$() {
        return from(this.localStorage.get('savedFields'))
            .pipe(
                map(d => {
                    const res = d ? d : {}
                    this.savedFields = res
                    return res;
                })
            )
    }

    addSavedField(tagId, tags){
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
        return this.http.get(`assets/tagsAndPresets/tags.json`)
            .pipe( 
                map( tagsConfig => {
                    this.primaryKeys = tagsConfig['primaryKeys'];
                    return tagsConfig
                })
            )
    }

    loadBaseMaps$() {
        return this.http.get(`assets/tagsAndPresets/basemap.json`)
            .pipe(
                map(baseMaps => {
                    this.configService.baseMapSources = baseMaps;
                    return baseMaps
                })
            )
    }

    loadPresets$() {
        return this.http.get(`assets/tagsAndPresets/presets.json`)
            .pipe(
                map((p) => { 
                    const json = p;
                    for (const k in json) {
                        json[k]['_id'] = k;
                    }
                    this.presets = json;
                   return json;
                })
            );
    }
 
    loadJsonSprites$() {
        const devicePixelRatio = window.devicePixelRatio > 1 ? 2 : 1;
        return this.http.get('assets/iconsSprites@x'+devicePixelRatio+'.json')
        .pipe(
            map( jsonSprites => {
                this.jsonSprites = jsonSprites;
                return jsonSprites;
            } )
        )
      }

      loadTags$(){
          return forkJoin(
            this.getTagsConfig$(),
            this.loadUserTags$(),
          ).pipe(
              map( ([tagsConfig, userTags]) => {
                  let tags = [...tagsConfig['tags'], ...userTags];
                this.tags = tags;
                return tags;
              })
          )
      }


    // loadtagsAndPresets$() {
    //     return forkJoin(
    //         this.loadJsonSprites$(),
    //         this.loadPresets$(),
    //         this.loadTags$(),
    //         this.loadBaseMaps$(),
    //         this.loadBookMarksIds$(),
    //         this.loadLastTagsUsedIds$(),
    //         this.loadHiddenTagsIds$()
    //     )
    //     .pipe(
    //         map( ([jsonSprites, presets, tagsConfig, baseMaps, bookmarksIds, lastTagsUsedIds, userTags, hiddenTagsIds]) => {
        
                   

    //                 return [jsonSprites, presets, tagsConfig, baseMaps, bookmarksIds, lastTagsUsedIds, userTags, hiddenTagsIds]
    //         } )
    //     )
    // }
}
