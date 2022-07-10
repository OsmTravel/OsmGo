import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { point, booleanPointInPolygon } from '@turf/turf'
import { map } from 'rxjs/operators'
import { Feature, MultiPolygon, Polygon } from 'geojson'

@Injectable({
    providedIn: 'root',
})
export class BasemapsService {
    constructor(private http: HttpClient) {}

    getBasemaps$(lng: number, lat: number): Observable<Record<string, any>[]> {
        return this.http.get<any[]>('assets/imagery.json').pipe(
            map((features: Feature<Polygon | MultiPolygon>[]) => {
                const result: Record<string, any>[] = []
                const p = point([lng, lat])
                for (const feature of features) {
                    if (feature.geometry) {
                        if (booleanPointInPolygon(p, feature)) {
                            result.push(feature.properties)
                        }
                    } else {
                        result.push(feature.properties)
                    }
                }
                return result
            })
        )
    }

    // imagery.geojson
}
