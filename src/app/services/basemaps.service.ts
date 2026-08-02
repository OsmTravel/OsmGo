import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { booleanPointInPolygon, point } from '@turf/turf'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import type { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface Basemap {
    id: string
    name: string
    tiles: string[]
    max_zoom?: number
    attribution?: { text?: string }
    [key: string]: unknown
}

@Injectable({
    providedIn: 'root',
})
export class BasemapsService {
    private readonly http = inject(HttpClient)

    getBasemaps$(lng: number, lat: number): Observable<Basemap[]> {
        return this.http
            .get<Array<Feature<Polygon | MultiPolygon, Basemap>>>(
                'assets/imagery.json'
            )
            .pipe(
                map((features) => {
                    const result: Basemap[] = []
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
