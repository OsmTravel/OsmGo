import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, forkJoin } from 'rxjs';
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

  presetsConfig = {};
  tagsConfig = {};
  aggStats;
  jsonSprites;
  language ;
  country;



  constructor(private http: HttpClient) {
    console.log(this.language)
  }


  presetsConfig$() {
    return this.http.get<any[]>(`/api/OsmGoPresets/${this.language}/${this.country}`)
      .pipe(
        map((data) => {
          Object.keys(data).map(k => {
            data[k]['_id'] = k;
            return data[k];
          });

        }),
        shareReplay()
      );
  }


  tagsConfig$(language, country) {
    return forkJoin(
      this.http.get(`/api/OsmGoTags/${this.language}/${this.country}`).pipe(
        shareReplay()
      ),
      this.getFullStat$(),
      this.getPresetsConfig$(language, country)
    )
      .pipe(
        map(data => {
          const tags = data[0];
          const tagInfo = data[1];
          this.presetsConfig = data[2]

          for ( let k in tags){
            tags[k].values = tags[k].values.map(tag => {
              // console.log(tag);
              let count =0;
              let percentage = 0;
              let findedItem = tagInfo[k].values.find( item => item.value === tag.key)
              if (findedItem){
                count = findedItem.count;
                percentage = Math.round((count / tagInfo[k].sum *100) *100000) /100000
              }
              // console.log(findedItem);
              return {...tag, _count :count, _percentage:percentage} ;
            })
          }
          this.tagsConfig = tags;
          return tags;
        })
      )
  }

  iconsList$(): Observable<any> {
    return this.http.get<any[]>('/api/svgList').pipe(
      shareReplay()
    );
  }

  generatesSprites(language, country) {
    return this.http.get(`/api/generateSprites/${language}/${country}`);
  }

  getPresetsConfig$(language, country) {
    return this.http.get(`/api/OsmGoPresets/${language}/${country}`)
      .pipe(
        map( data => {
         
           const withId = {}
          for (let k in data){
            withId[k] = {...data[k], _id: k}

          }
          return withId;
        })
      );
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
    return this.http.get(`/api/PkeyStats`)
      .pipe(
        map(data => {
          this.aggStats = data;
          return data
        })
      );
  }

  getJsonSprite$() {
    return this.http.get(`/api/sprites/json/${this.language}/${this.country}`);
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
    return this.http.get(`/api/OsmGoTags/${this.language}/${this.country}`).pipe(
      map(el => {
        const keys = Object.keys(el);
        let tags = [];
        keys.map(key => {
          tags = [...tags, ...el[key].values];
        });
        return tags.filter(tag => tag['presets'].indexOf(idPreset) !== -1);
      }
      ),
      shareReplay()
    );
  }


  updatePrimaryTag(pkey, value, data) {
    return this.http.post<any>(`/api/tag/${this.language}/${this.country}/${pkey}/${value}`, data, httpOptions)
      .pipe(
        // catchError( err => console.log(err))
      );
    // return this.http.get(`/api/PkeyPvalueStat/${pkey}/${value}`);
  }

  deleteTag(pkey, value){
    return this.http.delete<any>(
      `/api/tag/${this.language}/${this.country}/${pkey}/${value}`
      )
    .pipe(
      // catchError( err => console.log(err))
    );
  }

  postPrest(pkey, pvalue, oldId, newId, data) {
    console.log(oldId, newId);
    // { primary : {key, value}, oldId, newid, data:{preset...}}
    const params = { primary: { key: pkey, value: pvalue }, ids: { 'oldId': oldId, 'newId': newId }, data: data };
    return this.http.post<any>(`/api/presets/${this.language}/${this.country}`, params, httpOptions);
  }

  postNewPvalue$(pkey, newPvalue) {
    const params = { pkey: pkey, newPvalue: newPvalue };
    return this.http.post<any>(`/api/tag/${this.language}/${this.country}`, params, httpOptions);
  }

}
