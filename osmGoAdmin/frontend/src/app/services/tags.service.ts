import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from, of, forkJoin } from 'rxjs';
import { map, take, shareReplay, tap, filter, mergeAll, catchError, mapTo } from 'rxjs/operators';
import { HttpHeaders } from '@angular/common/http';
import { DataService } from './data.service';



@Injectable({
  providedIn: 'root'
})
export class TagsService {

  presetsConfig = {};
  tagsConfig = {};
  aggStats;
  language ;
  country ;



  constructor(private http: HttpClient, public dataService : DataService) {
  
  }


  presetsConfig$() {
    // useless ?

    return this.http.get<any[]>(`./api/OsmGoPresets/${this.language}/${this.country}`, this.dataService.getHttpOption())
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
      this.http.get(`./api/OsmGoTags/${this.language}/${this.country}`, this.dataService.getHttpOption()).pipe(
        shareReplay()
      ),
      this.getFullStat$(country),
      this.getPresetsConfig$(language, country)
    )
      .pipe(
        map(data => {
          const tags = data[0];
          const tagInfo = data[1];
          this.presetsConfig = data[2]

          for ( let k in tags){
            tags[k].values = tags[k].values.map(tag => {
              let count =0;
              let percentage = 0;
              let description
              if (!tagInfo[k]){
                return {...tag, _count :null, _percentage:null} ;
              }
              let findedItem = tagInfo[k].values.find( item => item.value === tag.key)
              if (findedItem){
                count = findedItem.count;
                percentage = (Math.round((findedItem.fraction ) *1000) /1000) * 100;
                description = findedItem.description
              }

              return {...tag, _count :count, _percentage:percentage, _description:description} ;
            })
          }
          this.tagsConfig = tags;
          return tags;
        })
      )
  }

  iconsList$(): Observable<any> {
    return this.http.get<any[]>('./api/svgList', this.dataService.getHttpOption()).pipe(
      shareReplay()
    );
  }

  getPresetsConfig$(language, country) {
    return this.http.get(`./api/OsmGoPresets/${language}/${country}`, this.dataService.getHttpOption())
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

  getPresetsSummary(country, pkey, value) {
    return this.http.get(`./api/TagInfoLike/${country}/${pkey}/${value}`, this.dataService.getHttpOption());
  }

  getTagInfoTags$(country, pkey, value, key) {
    return this.http.get(`./api/TagInfoLike/${country}/${pkey}/${value}/${key}`, this.dataService.getHttpOption());
  }

  getFullStat$(country) {
    return this.http.get(`./api/PkeyStats/${country}`, this.dataService.getHttpOption())
      .pipe(
        map(data => {
          this.aggStats = data;
          return data
        })
      );
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
    return this.http.get(`./api/OsmGoTags/${this.language}/${this.country}`, this.dataService.getHttpOption()).pipe(
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
    return this.http.post<any>(`./api/tag/${this.language}/${this.country}/${pkey}/${value}`, data, this.dataService.getHttpOption())
      .pipe(
        // catchError( err => console.log(err))
      );

  }

  deleteTag(pkey, value){
    return this.http.delete<any>(
      `./api/tag/${this.language}/${this.country}/${pkey}/${value}`, this.dataService.getHttpOption()
      )
    .pipe(
      // catchError( err => console.log(err))
    );
  }

  postTagSettings$(pkey, lbl, exclude_way_values) {
    const data = { lbl, exclude_way_values }
    return this.http.post<any>(`./api/tagSetting/${this.language}/${this.country}/${pkey}`, data , this.dataService.getHttpOption())
      .pipe(
        // catchError( err => console.log(err))
      );
 
  }

 

  postPreset(pkey, pvalue, oldId, newId, data) {

    // { primary : {key, value}, oldId, newid, data:{preset...}}
    const params = { primary: { key: pkey, value: pvalue }, ids: { 'oldId': oldId, 'newId': newId }, data: data };
    return this.http.post<any>(`./api/presets/${this.language}/${this.country}`, params, this.dataService.getHttpOption());
  }


  postNewPvalue$(pkey, newPvalue) {

    const params = { pkey: pkey, newPvalue: newPvalue };
    return this.http.post<any>(`./api/tag/${this.language}/${this.country}`, params, this.dataService.getHttpOption());
  }
}
