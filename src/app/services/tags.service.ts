import { HttpClient } from '@angular/common/http';
import { Observable, from, forkJoin } from 'rxjs';
import { map} from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { ConfigService } from './config.service';
import { cloneDeep } from 'lodash';


@Injectable({ providedIn: 'root' })
export class TagsService {
    lastTagAdded = {};
    bookMarks = [];
    tags;
    presets = {};
    basemaps;
    primaryKeys = [];


    constructor(private http: HttpClient,
        public localStorage: Storage,
        public configService: ConfigService) {
    }

    // bookMarks
    getBookMarks() {
        return this.bookMarks;
    }
    setBookMarks(bookMarks) {
        this.localStorage.set('bookMarks', bookMarks);
        this.bookMarks = bookMarks;
    }

    addRemoveBookMark(tag) {
        let ind = -1;
        for (let i = 0; i < this.bookMarks.length; i++) {
            if (this.bookMarks[i].key === tag.key && this.bookMarks[i].primaryKey === tag.primaryKey) {
                ind = i;
            }
        }

        if (ind === -1) {
            this.bookMarks.push(tag);
        } else {
            this.bookMarks.splice(ind, 1);
        }
        this.localStorage.set('bookMarks', this.bookMarks);
    }


    loadBookMarks$() {
        return from(this.localStorage.get('bookMarks'))
            .pipe(
                map(d => {
                    if (d) {
                        this.bookMarks = d;
                    } else {
                        this.bookMarks = [];
                    }
                    return this.bookMarks;
                })
            )
    }


    // LastTagAdded
    getLastTagAdded() {
        return this.lastTagAdded;
    }
    setLastTagAdded(lastTag) {
        this.localStorage.set('lastTagAdded', lastTag);
        this.lastTagAdded = lastTag;
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

    getAllTags(language, country): Observable<any> { // tags à plat ?
        return this.http.get(`assets/i18n/${language}/${country}/tags.json`)
            .pipe(
                map(res => {
                    const tags = res;
                    for (const tagsObject in tags) {
                        for (let i = 0; i < tags[tagsObject].values.length; i++) {
                            tags[tagsObject].values[i]['primaryKey'] = tagsObject;
                        }
                    }
                    this.tags = tags;
                    return tags;
                })
            );
    }

    getTagConfigByKeyValue(key, value) {
        const filtered = this.tags[key].values.filter(elem => elem.key === value);
        if (filtered.length > 0) {
            return filtered[0];
        } else {
            return undefined;
        }
    }



    loadTags(language, country) {
        this.http.get(`assets/i18n/${language}/${country}/tags.json`)
            .pipe(
                map((res) => {
                    return res;
                })
            )
            .subscribe(data => {
                const tags = data;
                for (const tagsObject in tags) {
                    for (let i = 0; i < tags[tagsObject].values.length; i++) {
                        tags[tagsObject].values[i]['primaryKey'] = tagsObject;
                    }

                }
                this.tags = tags;
                this.getListOfPrimaryKey();
                return tags;
            });
        // .catch((error: any) => throwError(error.json().error || 'Server error'));
    }



    getTags() {
        return cloneDeep(this.tags);
    }

    getFullTags() {
        const res = [];
        const tags = this.getTags();
        for (const tagsObject in tags) {
            for (let i = 0; i < tags[tagsObject].values.length; i++) {
                const currentTag = cloneDeep(tags[tagsObject].values[i]);
                res.push(currentTag);
            }
        }
        return res;
    }

    getBaseMaps(language, country) {
        return this.http.get(`assets/i18n/${language}/${country}/basemap.json`)
            .pipe(
                map((p) => {
                    this.configService.baseMapSources = p;
                    return this.basemaps;
                })
            );
    }

    loadPresets(language, country) {
        return this.http.get(`assets/i18n/${language}/${country}/presets.json`)
            .pipe(
                map((p) => { // c'est moche... vivement rx6.
                    const json = p;
                    for (const k in json) {
                        json[k]['_id'] = k;
                    }
                    this.presets = json;
                    return this.presets;
                })
            );
    }

    loadTagsAndPresets$(language, country) {
        return forkJoin(
            this.loadPresets(language, country),
            this.getAllTags(language, country),
            this.getBaseMaps(language, country)
                .pipe(
                    map(allTags => {
                        for (const key in allTags) {
                            this.primaryKeys.push({ lbl: allTags[key].lbl, key: key });
                        }
                    })
                )
        )
    }


    getPresetsById(id) {
        return this.presets[id];
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

    getConfigMarkerByKv(k, v) {
        const tags = this.getTags();
        if (tags[k]) {
            for (const i in tags[k].values) {
                if (tags[k].values[i].key === v) {
                    return tags[k].values[i];
                }
            }
        }
    }
}
