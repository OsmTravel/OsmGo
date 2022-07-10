import { Injectable, EventEmitter } from '@angular/core'

import { ConfigService } from '@services/config.service'

import { Geolocation } from '@capacitor/geolocation'

@Injectable({ providedIn: 'root' })
export class LocationService {
    eventNewLocation = new EventEmitter()
    eventNewCompassHeading = new EventEmitter()
    eventStartCompassHeading = new EventEmitter()
    eventLocationIsReady = new EventEmitter()
    location
    pointGeojson
    compassHeading = {
        magneticHeading: null,
        trueHeading: null,
        headingAccuracy: null,
        timestamp: null,
    }

    gpsIsReady = false
    subscriptionLocation
    subscriptionWatchLocation
    forceOpen = false // l'utilisateur a fait le choix d'ouvrir l'app sans geoloc
    headingIsDisable = false

    geolocationStatPermission: string = undefined

    constructor(public configService: ConfigService) {}

    watchPosition() {
        if (this.subscriptionWatchLocation) {
            this.subscriptionWatchLocation.clearwatch()
        }
        this.subscriptionWatchLocation = navigator.geolocation.watchPosition(
            (position) => {
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

    enableGeolocation() {
        this.heading()
        Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            maximumAge: 3000,
        }).then((position) => {
            this.location = position
            this.eventNewLocation.emit(this.getGeojsonPos())

            this.eventLocationIsReady.emit(position)

            this.gpsIsReady = true
            this.watchPosition()
        })
    }

    disableGeolocation() {
        this.subscriptionWatchLocation.clearwatch()
    }

    heading() {
        const onDeviceOrientation = (event) => {
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

            let newCompassHeading = {
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
    getLocation() {
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

    getGeojsonPos() {
        if (!this.location) {
            console.log('nop')
            return
        }
        const lon = this.location.coords.longitude
        const lat = this.location.coords.latitude
        const accuracy =
            this.location && this.location.coords
                ? this.location.coords.accuracy
                : 0
        const heading = this.compassHeading.magneticHeading

        this.pointGeojson = {
            type: 'FeatureCollection',
            features: [
                {
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

    getGeoJSONCirclePosition(points = 64) {
        if (!points) {
            points = 64
        }
        const radiusInKm = this.location.coords.accuracy / 1000
        const coords = {
            latitude: this.location.coords.latitude,
            longitude: this.location.coords.longitude,
        }
        const km = radiusInKm
        const ret = []
        const distanceX =
            km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180))
        const distanceY = km / 110.574

        let theta, x, y
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
                },
            ],
        }
    }
}
