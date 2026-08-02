import { HttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import type { Feature, Polygon } from 'geojson'
import { firstValueFrom, of } from 'rxjs'
import { type Basemap, BasemapsService } from './basemaps.service'

describe('BasemapsService', () => {
    it('loads the imagery index on demand and reuses it across queries', async () => {
        const worldwide: Feature<Polygon, Basemap> = {
            type: 'Feature',
            properties: {
                id: 'worldwide',
                name: 'Worldwide',
                tiles: ['https://tiles.example/{z}/{x}/{y}'],
            },
            geometry: null as unknown as Polygon,
        }
        const http = { get: vi.fn(() => of([worldwide])) }
        TestBed.configureTestingModule({
            providers: [
                BasemapsService,
                { provide: HttpClient, useValue: http },
            ],
        })
        const service = TestBed.inject(BasemapsService)

        expect(http.get).not.toHaveBeenCalled()
        await firstValueFrom(service.getBasemaps$(2, 48))
        await firstValueFrom(service.getBasemaps$(3, 49))

        expect(http.get).toHaveBeenCalledOnce()
        expect(http.get).toHaveBeenCalledWith('assets/imagery.json')
    })
})
