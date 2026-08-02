import { TestBed } from '@angular/core/testing'
import { ConfigService } from '@services/config.service'
import type { FeatureCollection, Point } from 'geojson'
import { LocationService } from './location.service'

describe('LocationService', () => {
    const position = {
        coords: {
            accuracy: 5,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            latitude: 48.85,
            longitude: 2.35,
            speed: null,
        },
        timestamp: 1,
    } as GeolocationPosition

    const createService = (): LocationService => {
        TestBed.configureTestingModule({
            providers: [{ provide: ConfigService, useValue: {} }],
        })
        return TestBed.runInInjectionContext(() => new LocationService())
    }

    it('exposes the current position and GPS readiness as signals', async () => {
        const service = createService()
        const locations: FeatureCollection<Point>[] = []
        service.newLocation$.subscribe((location) => locations.push(location))
        vi.spyOn(service, 'getCurrentPosition').mockResolvedValue(position)
        vi.spyOn(service, 'watchPosition').mockReturnValue(undefined)
        vi.spyOn(service, 'heading').mockReturnValue(undefined)

        service.enableGeolocation()

        await vi.waitFor(() => expect(service.gpsIsReady()).toBe(true))
        expect(service.location()).toBe(position)
        expect(service.getCoordsPosition()).toEqual([2.35, 48.85])
        expect(locations[0].features[0].geometry.coordinates).toEqual([
            2.35, 48.85,
        ])
    })
})
