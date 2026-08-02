import { inject, Service, signal } from '@angular/core'
import { CompassHeading } from '@osmgo/type'
import { ConfigService } from '@services/config.service'
// import { Geolocation } from '@capacitor/geolocation'
import { FeatureCollection, Point } from 'geojson'
import { Subject } from 'rxjs'

const EMPTY_COMPASS_HEADING: CompassHeading = {
    magneticHeading: null,
    trueHeading: null,
    headingAccuracy: null,
    timestamp: null,
}

const GEOLOCATION_TIMEOUT_MS = 15_000

type DeviceOrientationPermission = typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>
}

@Service()
export class LocationService {
    readonly configService = inject(ConfigService)

    private readonly newLocationSubject = new Subject<
        FeatureCollection<Point>
    >()
    readonly newLocation$ = this.newLocationSubject.asObservable()
    private readonly compassHeadingSubject = new Subject<CompassHeading>()
    readonly compassHeadingChanges$ = this.compassHeadingSubject.asObservable()
    private readonly locationReadySubject = new Subject<GeolocationPosition>()
    readonly locationReady$ = this.locationReadySubject.asObservable()

    private readonly locationState = signal<GeolocationPosition | undefined>(
        undefined
    )
    readonly location = this.locationState.asReadonly()
    private readonly compassHeadingState = signal<CompassHeading>(
        EMPTY_COMPASS_HEADING
    )
    readonly compassHeading = this.compassHeadingState.asReadonly()
    private readonly gpsReadyState = signal(false)
    readonly gpsIsReady = this.gpsReadyState.asReadonly()

    private watchId?: number
    private orientationEventName?:
        | 'deviceorientationabsolute'
        | 'deviceorientation'

    watchPosition(): void {
        if (this.watchId !== undefined) {
            navigator.geolocation.clearWatch(this.watchId)
        }
        this.watchId = navigator.geolocation.watchPosition(
            (position: GeolocationPosition) => {
                if (position?.coords) {
                    this.setLocation(position)
                    this.gpsReadyState.set(true)
                }
            },
            (err) => {
                console.error(err)
                this.gpsReadyState.set(false)
            },
            { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS }
        )
    }

    getCurrentPosition(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position: GeolocationPosition) => {
                    resolve(position)
                },
                (err) => {
                    reject(err)
                },
                { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS }
            )
        })
    }

    enableGeolocation(): void {
        this.heading()
        void this.getCurrentPosition()
            .then((position: GeolocationPosition) => {
                this.setLocation(position)
                this.gpsReadyState.set(true)
                this.locationReadySubject.next(position)
                this.watchPosition()
            })
            .catch(() => {
                this.gpsReadyState.set(false)
            })
    }

    disableGeolocation(): void {
        if (this.watchId !== undefined) {
            navigator.geolocation.clearWatch(this.watchId)
            this.watchId = undefined
        }
        if (this.orientationEventName) {
            window.removeEventListener(
                this.orientationEventName,
                this.onDeviceOrientation,
                true
            )
            this.orientationEventName = undefined
        }
        this.gpsReadyState.set(false)
    }

    heading(): void {
        if (this.orientationEventName) {
            window.removeEventListener(
                this.orientationEventName,
                this.onDeviceOrientation,
                true
            )
        }

        if (typeof window['ondeviceorientationabsolute'] == 'object') {
            this.orientationEventName = 'deviceorientationabsolute'
        } else if (typeof window['ondeviceorientation'] == 'object') {
            this.orientationEventName = 'deviceorientation'
        } else {
            return
        }

        const orientationApi = window.DeviceOrientationEvent as
            | DeviceOrientationPermission
            | undefined
        if (orientationApi?.requestPermission) {
            void orientationApi
                .requestPermission()
                .then((permission) => {
                    if (permission === 'granted') this.listenForHeading()
                })
                .catch(() => undefined)
            return
        }
        this.listenForHeading()
    }

    private readonly onDeviceOrientation = (event: DeviceOrientationEvent) => {
        if (
            event.alpha === null ||
            event.beta === null ||
            event.gamma === null
        ) {
            return
        }

        const alphaRad = event.alpha * (Math.PI / 180)
        const betaRad = event.beta * (Math.PI / 180)
        const gammaRad = event.gamma * (Math.PI / 180)

        const cA = Math.cos(alphaRad)
        const sA = Math.sin(alphaRad)
        const sB = Math.sin(betaRad)
        const cG = Math.cos(gammaRad)
        const sG = Math.sin(gammaRad)

        const rA = -cA * sG - sA * sB * cG
        const rB = -sA * sG + cA * sB * cG

        const screenAngle = window.screen.orientation?.angle ?? 0
        const heading =
            ((Math.atan2(rA, rB) * 180) / Math.PI + screenAngle + 360) % 360

        const newCompassHeading: CompassHeading = {
            magneticHeading: heading,
            trueHeading: event.absolute ? heading : null,
            headingAccuracy: null,
            timestamp: Date.now(),
        }

        this.compassHeadingState.set(newCompassHeading)
        this.compassHeadingSubject.next(newCompassHeading)
    }

    private setLocation(position: GeolocationPosition): void {
        this.locationState.set(position)
        this.publishCurrentLocation()
    }

    getCoordsPosition(): [number, number] {
        const location = this.location()
        if (location?.coords) {
            return [location.coords.longitude, location.coords.latitude]
        }
        throw new Error('no location')
    }

    getGeojsonPos(): FeatureCollection<Point> | undefined {
        const location = this.location()
        if (!location?.coords) return undefined

        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [
                            location.coords.longitude,
                            location.coords.latitude,
                        ],
                    },
                    properties: {
                        accuracy: location.coords.accuracy,
                        trueHeading:
                            this.compassHeading().trueHeading ??
                            this.compassHeading().magneticHeading,
                    },
                },
            ],
        }
    }

    publishCurrentLocation(): void {
        const point = this.getGeojsonPos()
        if (point) this.newLocationSubject.next(point)
    }

    private listenForHeading(): void {
        if (!this.orientationEventName) return
        window.addEventListener(
            this.orientationEventName,
            this.onDeviceOrientation,
            true
        )
    }

    getGeoJSONCirclePosition(points: number = 64): FeatureCollection {
        if (!points) {
            points = 64
        }
        const location = this.location()
        if (!location) throw new Error('no location')
        const radiusInKm = location.coords.accuracy / 1000
        const coords: { latitude: number; longitude: number } = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        }
        const km = radiusInKm
        const ret: number[][] = []
        const distanceX =
            km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180))
        const distanceY = km / 110.574

        let theta: number, x: number, y: number
        for (let i = 0; i < points; i++) {
            theta = (i / points) * (2 * Math.PI)
            x = distanceX * Math.cos(theta)
            y = distanceY * Math.sin(theta)
            ret.push([coords.longitude + x, coords.latitude + y])
        }
        ret.push(ret[0])
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: { type: 'Polygon', coordinates: [ret] },
                    properties: {},
                },
            ],
        }
    }
}
