import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { map, take, shareReplay, tap, filter, mergeAll, catchError, mapTo } from 'rxjs/operators';
import { HttpHeaders } from '@angular/common/http';

const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
  })
};

@Injectable({
  providedIn: 'root'
})
export class TagsService {

  tagsConfig$: Observable<any>;
  presetsConfig = [];
  presetsConfig$: Observable<any>;
  iconsList$: Observable<any>;
  tagsConfig = {};
  aggStats;
  jsonSprites;



  constructor(private http: HttpClient) {

    this.presetsConfig$ = this.http.get<any[]>('/api/OsmGoPresets').pipe(
      map((data) => {
        Object.keys(data).map(k => {
          data[k]['_id'] = k;
          return data[k];
        });
        return data;
      }),
      shareReplay()
    );

    this.presetsConfig$.subscribe(data => {
      this.presetsConfig = data;
    });

    this.tagsConfig$ = this.http.get('/api/OsmGoTags').pipe(

      map(res => res),
      shareReplay()
    );

    this.iconsList$ = this.http.get<any[]>('/api/svgList').pipe(
      shareReplay()
    );

  }

  generatesSprites() {
    return this.http.get('/api/generateSprites');
  }

  getPresetsConfig() {
    return this.http.get('/api/OsmGoPresets');
  }
  getGenericPresets() {
    const genericPresets = [];
    for (const pid in this.presetsConfig) {
      if (!/#/.test(this.presetsConfig[pid]._id)) {
        genericPresets.push(this.presetsConfig[pid]);
      }
    }
    return genericPresets;
  }

  getPrsetsSummary(pkey, value) {
    return this.http.get(`/api/PkeyPvalueStat/${pkey}/${value}`);
  }

  getFullStat$() {
    return this.http.get(`/api/PkeyStats`);
  }

  getJsonSprite$() {
    return this.http.get('/api/sprites/json');
  }
  getPresetsKeyByPrimaryTag(key, value) {
    const keys = [];
    const findedIndex = this.tagsConfig[key].values
      .findIndex(tag => tag.key === value);
    const currentTag = this.tagsConfig[key].values[findedIndex];
    const idsPresets = currentTag.presets;

    for (let i = 0; i < idsPresets.length; i++) {
      const id = idsPresets[i];
      keys.push(this.presetsConfig[id].key);
    }
    return keys;
  }

  getPresetsByKey(key) {
    const presetsFiltered = [];
    const presets = this.presetsConfig$;
    for (const p in presets) {
      if (presets[p].key === key) {
        presetsFiltered.push(presets[p]);
      }
    }
    return presetsFiltered;
  }



  tagsUseThisPreset$(idPreset: string) {
    return this.tagsConfig$
      .pipe(
        map(el => {
          const keys = Object.keys(el);
          let tags = [];
          keys.map(key => {
            tags = [...tags, ...el[key].values];
          });
          return tags.filter(tag => tag['presets'].indexOf(idPreset) !== -1);
        }
        ));
  }



  getTagsUseThisPreset(idPreset: string): Observable<string[]> {
    return this.tagsConfig$.pipe(

    );
  }

  updatePrimaryTag(pkey, value, data) {
    return this.http.post<any>(`/api/tag/${pkey}/${value}`, data, httpOptions)
      .pipe(
        // catchError( err => console.log(err))
      );
    // return this.http.get(`/api/PkeyPvalueStat/${pkey}/${value}`);
  }

  postPrest(pkey, pvalue, oldId, newId, data) {
    console.log(oldId, newId);
    // { primary : {key, value}, oldId, newid, data:{preset...}}
    const params = { primary: { key: pkey, value: pvalue }, ids: { 'oldId': oldId, 'newId': newId }, data: data };
    return this.http.post<any>(`/api/presets/`, params, httpOptions);
  }

  postNewPvalue$(pkey, newPvalue) {
    const params = { pkey: pkey, newPvalue: newPvalue };
    return this.http.post<any>(`/api/tag/`, params, httpOptions);
  }

}
