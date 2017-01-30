import { Injectable, EventEmitter } from '@angular/core';
import { Geolocation, DeviceOrientation, Diagnostic } from 'ionic-native';


@Injectable()
export class LocationService {
    eventNewLocation = new EventEmitter();
    eventNewCompassHeading = new EventEmitter();
    eventStartCompassHeading = new EventEmitter();
    eventPlatformReady = new EventEmitter();
    location;
    pointGeojson;
    compassHeading = { magneticHeading: 0, trueHeading: 0, headingAccuracy: 0, timestamp: 0 };
    headingTest = 0;
    gpsIsReady = false;
    subscriptionLocation;
    subscriptionWatchLocation;

    constructor() {



        // this.compassHeading = { magneticHeading: 0, trueHeading: 0, headingAccuracy: 0, timestamp: 0 };


        this.eventPlatformReady.subscribe(isVirtual => {
            /*DEBUG ionic serve */
            if (isVirtual) {
                this.location = { coords: { accuracy: 20, altitude: null, altitudeAccuracy: null, heading: null, latitude: 45.1865723, longitude: 5.7171862, speed: null }, timestamp: 1479114012803 };
                this.eventNewLocation.emit(this.getGeojsonPos());
                this.gpsIsReady = true;
                this.enableGeolocation();
            } else {

                Diagnostic.registerLocationStateChangeHandler(data => {
                    if (data === 'location_off') {
                        this.disableGeolocation();
                    } else {
                        this.enableGeolocation();
                    }
                })

                Diagnostic.isLocationAuthorized()
                    .then(autorised => {
                        if (autorised === false) {
                            Diagnostic.requestLocationAuthorization().then(e => {
                                if (e == 'GRANTED') {
                                    this.checkIfLocationIsAvailable()
                                }
                            })

                        } else {
                            this.checkIfLocationIsAvailable()
                        }
                    })
            }
            this.heading(isVirtual)
        })
    }

    checkIfLocationIsAvailable() {
        Diagnostic.isLocationAvailable()
            .then(isLocationAvailable => {
                if (!isLocationAvailable) {
                    Diagnostic.switchToLocationSettings();
                } else { // la loc est activé
                    this.enableGeolocation();
                }
            })
            .catch(error => {
               
            });
    }

    enableGeolocation() {
     
        this.subscriptionWatchLocation = Geolocation.watchPosition({ enableHighAccuracy: true })
            //.filter((p) => p === undefined) //Filter Out Errors
            // .filter((p: PositionError) => {
            //     if (p.code == 1) { // debug run livereload (fix => non https)
            //         this.location = { coords: { accuracy: 20, altitude: null, altitudeAccuracy: null, heading: null, latitude: 45.1865723, longitude: 5.7171862, speed: null }, timestamp: 1479114012803 };
            //         this.eventNewLocation.emit(this.getGeojsonPos());
                  
            //         if (!this.gpsIsReady)
            //             this.gpsIsReady = true;
            //     }
            //     return p.code === undefined
            // }) //Filter Out Errors
            .subscribe((data) => {
                this.getGeojsonPos()
                if (!this.gpsIsReady)
                    this.gpsIsReady = true;
                this.location = data;
                this.eventNewLocation.emit(this.getGeojsonPos());
            });
    };

    disableGeolocation() {
        this.subscriptionWatchLocation.unsubscribe()
    }

    heading(isVirtual) {
        if (isVirtual) { // for testing : ionic Serve
                this.compassHeading = { magneticHeading: 0, trueHeading: 0, headingAccuracy: 0, timestamp: 0 };
                this.eventNewCompassHeading.emit(this.compassHeading);
        } else {
            DeviceOrientation.watchHeading({ frequency: 50 }).subscribe((data) => {
                this.compassHeading = data;
                this.eventNewCompassHeading.emit(data);
            });
        }
    }
    getLocation() {
        return this.location;
    }

    getCoordsPosition() {
        if (this.location) {
            return [this.location.coords.longitude, this.location.coords.latitude]
        }
        else {
            return [0, 0];
        }
    }

    getGeojsonPos() {
        let lon = (this.location && this.location.coords) ? this.location.coords.longitude : 5.6;
        let lat = (this.location && this.location.coords) ? this.location.coords.latitude : 45.6;
        let accuracy = (this.location) ? this.location.coords.accuracy : 0;
        let heading = this.compassHeading.trueHeading;

        this.pointGeojson = {
            "type": "FeatureCollection", "features": [
                {
                    "geometry": { "type": "Point", "coordinates": [lon, lat] },
                    "properties": {
                        "accuracy": accuracy,
                        "trueHeading": heading
                    }
                }
            ]
        }
        return this.pointGeojson
    }

    getGeoJSONCirclePosition(points = 64) {
        if (!points) points = 64;
        let radiusInKm = this.location.coords.accuracy / 1000;
        let coords = {
            latitude: this.location.coords.latitude,
            longitude: this.location.coords.longitude
        };
        let km = radiusInKm;
        let ret = [];
        let distanceX = km / (111.320 * Math.cos(coords.latitude * Math.PI / 180));
        let distanceY = km / 110.574;

        let theta, x, y;
        for (let i = 0; i < points; i++) {
            theta = (i / points) * (2 * Math.PI);
            x = distanceX * Math.cos(theta);
            y = distanceY * Math.sin(theta);
            ret.push([coords.longitude + x, coords.latitude + y]);
        }
        ret.push(ret[0]);
        return {
            "type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": { "type": "Polygon", "coordinates": [ret] } }]
        };
    };
}
