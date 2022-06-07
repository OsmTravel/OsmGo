import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { point, booleanPointInPolygon } from '@turf/turf'
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BasemapsService {

  constructor(private http: HttpClient) { }

  getBasemaps$( lng: number, lat: number):Observable<any[]>{
    return this.http.get<any[]>('assets/imagery.json')
      .pipe(
        map( features => {

          const result = []
          const p = point([lng, lat]);
          console.log(p);
          for (const feature of features){
            if (feature.geometry){
              if (booleanPointInPolygon(p, feature)){
                // console.log(feature)
                result.push(feature.properties)
              }
            } 
            else {
              result.push(feature.properties);
            }
          }
          return result

        })
      )
  }

  // imagery.geojson
}
