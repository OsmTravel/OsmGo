import { Injectable, EventEmitter } from '@angular/core'

import { ConfigService } from '@services/config.service'

import { Geolocation } from '@capacitor/geolocation'
import { FeatureCollection, Point } from 'geojson'
import { CompassHeading } from '@osmgo/type'

@Injectable({ providedIn: 'root' })
export class LocationService {
    eventNewLocation = new EventEmitter<FeatureCollection>()
    eventNewCompassHeading = new EventEmitter<CompassHeading>()
    eventLocationIsReady = new EventEmitter<GeolocationPosition>()
    location: GeolocationPosition
    pointGeojson: FeatureCollection<Point>
    compassHeading: CompassHeading = {
        magneticHeading: null,
        trueHeading: null,
        headingAccuracy: null,
        timestamp: null,
    }

    gpsIsReady: boolean = false
    subscriptionWatchLocation: number

    constructor(public configService: ConfigService) {}

    watchPosition(): void {
        if (this.subscriptionWatchLocation) {
            navigator.geolocation.clearWatch(this.subscriptionWatchLocation)
        }
        this.subscriptionWatchLocation = navigator.geolocation.watchPosition(
            (position: GeolocationPosition) => {
                if (!this.location) {
                    this.location = position
                    this.eventNewLocation.emit(this.getGeojsonPos())
                } else if (
                    position &&
                    position.coords &&
                    !this.configService.freezeMapRenderer
                ) {
                    const deltaLat = Math.abs(
                        position.coords.latitude - this.location.coords.latitude
                    )
                    const deltaLng = Math.abs(
                        position.coords.longitude -
                            this.location.coords.longitude
                    )
                    const deltaAccuracy = Math.abs(
                        position.coords.accuracy - this.location.coords.accuracy
                    )
                    if (
                        deltaLat > 0.00001 ||
                        deltaLng > 0.00001 ||
                        deltaAccuracy > 4
                    ) {
                        this.location = position
                        this.eventNewLocation.emit(this.getGeojsonPos())
                    }
                }
            },
            (err) => {
                console.log(err)
            },
            { enableHighAccuracy: true }
        )
    }

    enableGeolocation(): void {
        this.heading()
        Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            maximumAge: 3000,
        }).then((position: GeolocationPosition) => {
            this.location = position
            this.eventNewLocation.emit(this.getGeojsonPos())

            this.eventLocationIsReady.emit(position)

            this.gpsIsReady = true
            this.watchPosition()
        })
    }

    disableGeolocation(): void {
        navigator.geolocation.clearWatch(this.subscriptionWatchLocation)
    }

    heading(): void {
        const onDeviceOrientation = (event: DeviceOrientationEvent) => {
            if (!event.absolute) {
                return
            }
            if (!event.alpha || !event.beta || !event.gamma) {
                return
            }

            // Convert degrees to radians
            const alphaRad = event.alpha * (Math.PI / 180)
            const betaRad = event.beta * (Math.PI / 180)
            const gammaRad = event.gamma * (Math.PI / 180)

            // Calculate equation components
            const cA = Math.cos(alphaRad)
            const sA = Math.sin(alphaRad)
            const cB = Math.cos(betaRad)
            const sB = Math.sin(betaRad)
            const cG = Math.cos(gammaRad)
            const sG = Math.sin(gammaRad)

            // Calculate A, B, C rotation components
            const rA = -cA * sG - sA * sB * cG
            const rB = -sA * sG + cA * sB * cG
            const rC = -cB * cG

            // Calculate compass heading
            let compassHeading = Math.atan(rA / rB)

            // Convert from half unit circle to whole unit circle
            if (rB < 0) {
                compassHeading += Math.PI
            } else if (rA < 0) {
                compassHeading += 2 * Math.PI
            }

            // Convert radians to degrees
            compassHeading *= 180 / Math.PI

            let newCompassHeading: CompassHeading = {
                magneticHeading: compassHeading,
                trueHeading: compassHeading,
                headingAccuracy: null,
                timestamp: new Date().getTime(),
            }

            if (!this.configService.freezeMapRenderer) {
                if (
                    !this.compassHeading.magneticHeading ||
                    Math.abs(
                        compassHeading - this.compassHeading.magneticHeading
                    ) > 4
                ) {
                    // near 360? TODO
                    if (!this.configService.freezeMapRenderer) {
                        this.compassHeading = newCompassHeading
                        this.eventNewCompassHeading.emit(newCompassHeading)
                    }
                }
            }
        }

        if (typeof window['ondeviceorientationabsolute'] == 'object') {
            window.addEventListener(
                'deviceorientationabsolute',
                onDeviceOrientation,
                true
            )
        } else if (typeof window['ondeviceorientation'] == 'object') {
            window.addEventListener(
                'deviceorientation',
                onDeviceOrientation,
                true
            )
        } else {
            console.log('utiliser le heading du gps ?')
        }
    }

    getLocation(): GeolocationPosition {
        return this.location
    }

    getCoordsPosition(): [number, number] {
        if (this.location && this.location.coords) {
            return [
                this.location.coords.longitude,
                this.location.coords.latitude,
            ]
        } else {
            return [0, 0]
        }
    }

    getGeojsonPos(): FeatureCollection<Point> {
        if (!this.location) {
            console.log('nop')
            return
        }
        const lon: number = this.location.coords.longitude
        const lat: number = this.location.coords.latitude
        const accuracy: number =
            this.location && this.location.coords
                ? this.location.coords.accuracy
                : 0
        const heading = this.compassHeading.magneticHeading

        this.pointGeojson = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [lon, lat] },
                    properties: {
                        accuracy: accuracy,
                        trueHeading: heading,
                    },
                },
            ],
        }
        return this.pointGeojson
    }

    getGeoJSONCirclePosition(points: number = 64): FeatureCollection {
        if (!points) {
            points = 64
        }
        const radiusInKm = this.location.coords.accuracy / 1000
        const coords: { latitude: number; longitude: number } = {
            latitude: this.location.coords.latitude,
            longitude: this.location.coords.longitude,
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
