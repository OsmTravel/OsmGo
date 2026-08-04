import { TestBed } from '@angular/core/testing'
import { ConfigService } from '@services/config.service'
import type { FeatureCollection, Point, Polygon } from 'geojson'
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

    it('clears a previous position when a new request is denied', async () => {
        const service = createService()
        const locations: FeatureCollection<Point>[] = []
        service.newLocation$.subscribe((location) => locations.push(location))
        ;(
            service as unknown as {
                setLocation: (value: GeolocationPosition) => void
            }
        ).setLocation(position)
        vi.spyOn(service, 'getCurrentPosition').mockRejectedValue(
            new Error('Permission denied')
        )
        vi.spyOn(service, 'heading').mockReturnValue(undefined)

        service.enableGeolocation()

        await vi.waitFor(() => expect(locations.at(-1)?.features).toEqual([]))
        expect(service.location()).toBeUndefined()
        expect(service.gpsIsReady()).toBe(false)
    })

    it('ignores a position request that resolves after geolocation is disabled', async () => {
        const service = createService()
        let resolvePosition!: (value: GeolocationPosition) => void
        vi.spyOn(service, 'getCurrentPosition').mockReturnValue(
            new Promise((resolve) => {
                resolvePosition = resolve
            })
        )
        const watchPosition = vi
            .spyOn(service, 'watchPosition')
            .mockReturnValue(undefined)
        vi.spyOn(service, 'heading').mockReturnValue(undefined)

        service.enableGeolocation()
        service.disableGeolocation()
        resolvePosition(position)

        await Promise.resolve()
        expect(service.location()).toBeUndefined()
        expect(service.gpsIsReady()).toBe(false)
        expect(watchPosition).not.toHaveBeenCalled()
    })

    it('accepts zero-valued orientation angles and normalizes heading', () => {
        const service = createService()
        const headings: number[] = []
        service.compassHeadingChanges$.subscribe((heading) => {
            if (heading.trueHeading !== null) headings.push(heading.trueHeading)
        })

        ;(
            service as unknown as {
                onDeviceOrientation: (
                    event: Partial<DeviceOrientationEvent>
                ) => void
            }
        ).onDeviceOrientation({ absolute: true, alpha: 0, beta: 0, gamma: 0 })

        expect(headings).toEqual([0])
    })

    it.each([
        { latitude: Number.NaN },
        { latitude: 91 },
        { longitude: -181 },
        { accuracy: -1 },
        { accuracy: Number.POSITIVE_INFINITY },
    ])('rejects invalid geolocation coordinates: %o', (coords) => {
        const service = createService()
        const invalidPosition = {
            ...position,
            coords: { ...position.coords, ...coords },
        } as GeolocationPosition

        const accepted = (
            service as unknown as {
                setLocation: (value: GeolocationPosition) => boolean
            }
        ).setLocation(invalidPosition)

        expect(accepted).toBe(false)
        expect(service.location()).toBeUndefined()
        expect(service.gpsIsReady()).toBe(false)
    })

    it('builds a finite geodesic accuracy circle at the poles', () => {
        const service = createService()
        const polarPosition = {
            ...position,
            coords: { ...position.coords, latitude: 90, longitude: 180 },
        } as GeolocationPosition
        ;(
            service as unknown as {
                setLocation: (value: GeolocationPosition) => boolean
            }
        ).setLocation(polarPosition)

        const circle = service.getGeoJSONCirclePosition(8)
        const coordinates = (circle.features[0].geometry as Polygon)
            .coordinates[0]

        expect(coordinates).toHaveLength(9)
        expect(coordinates[0]).toEqual(coordinates.at(-1))
        expect(coordinates.flat().every(Number.isFinite)).toBe(true)
        expect(
            coordinates.every(
                ([longitude, latitude]) =>
                    longitude >= -180 &&
                    longitude <= 180 &&
                    latitude >= -90 &&
                    latitude <= 90
            )
        ).toBe(true)
    })

    it.each([0, 2, 3.5, Number.POSITIVE_INFINITY, 4097])(
        'rejects an invalid accuracy-circle point count: %s',
        (points) => {
            const service = createService()
            ;(
                service as unknown as {
                    setLocation: (value: GeolocationPosition) => boolean
                }
            ).setLocation(position)

            expect(() => service.getGeoJSONCirclePosition(points)).toThrow(
                RangeError
            )
        }
    )
})
