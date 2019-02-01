import { Injectable, EventEmitter } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { DeviceOrientation, DeviceOrientationCompassHeading } from '@ionic-native/device-orientation/ngx';

import { Diagnostic } from '@ionic-native/diagnostic/ngx';

import { distance, point } from '@turf/turf';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class LocationService {
    eventNewLocation = new EventEmitter();
    eventNewCompassHeading = new EventEmitter();
    eventStartCompassHeading = new EventEmitter();
    eventPlatformReady = new EventEmitter();
    eventLocationIsReady = new EventEmitter();
    location;
    pointGeojson;
    compassHeading = { magneticHeading: 0, trueHeading: 0, headingAccuracy: 0, timestamp: 0 };
    headingTest = 0;
    gpsIsReady = false;
    subscriptionLocation;
    subscriptionWatchLocation;
    forceOpen = false; // l'utilisateur a fait le choix d'ouvrir l'app sans geoloc
    headingIsDisable = false;

    constructor(
        private geolocation: Geolocation,
        private deviceOrientation: DeviceOrientation,
        private diagnostic: Diagnostic,
        public configService: ConfigService) {

        this.eventPlatformReady.subscribe(isVirtual => {
            /*DEBUG ionic serve */
            if (isVirtual) {
                this.enableGeolocation();
            } else {

                this.diagnostic.registerLocationStateChangeHandler(data => {
                    if (data === 'location_off') {
                        this.disableGeolocation();
                    } else {
                        this.enableGeolocation();
                    }
                });

                this.diagnostic.isLocationAuthorized()
                    .then(autorised => {
                        if (autorised === false) {
                            this.diagnostic.requestLocationAuthorization().then(e => {
                                if (e === 'GRANTED') {
                                    this.checkIfLocationIsAvailable();
                                } else {
                                    // l'utilisateur à refuser la geoloc ...
                                    this.dontUseLocation();
                                }
                            });

                        } else {
                            this.checkIfLocationIsAvailable();
                        }
                    });
            }
            this.heading();
        });
    }

    checkIfLocationIsAvailable() {
        this.diagnostic.isLocationAvailable()
            .then(isLocationAvailable => {
                if (!isLocationAvailable) {
                    this.diagnostic.switchToLocationSettings();
                } else { // la loc est activé
                    this.enableGeolocation();
                }
            })
            .catch(error => {

            });
    }

    enableGeolocation() {

        this.subscriptionWatchLocation = this.geolocation.watchPosition({ enableHighAccuracy: true })
            .subscribe((data) => {
                if (!data.coords) {
                    return data;
                }

                if (!this.gpsIsReady) {
                    this.configService.init.zoom = 19;
                    this.configService.init.lng = data.coords.longitude;
                    this.configService.init.lng = data.coords.latitude;
                    this.eventLocationIsReady.emit(data);
                    this.configService.geolocPageIsOpen = false;
                    this.configService.eventCloseGeolocPage.emit('gpsIsReady');
                    this.gpsIsReady = true;
                }

                let deltaDistance = Infinity;
                if (this.location && this.location.coords && !this.configService.freezeMapRenderer) {
                    const from = point([data.coords.longitude, data.coords.latitude]);
                    const to = point([this.location.coords.longitude, this.location.coords.latitude]);
                    deltaDistance = distance(from, to, { units: 'metres' }); // => m
                } else {

                }
                // on ne déplace le marker que si la position a changé d'au moins 2 m
                // Sinon ça regénère le rendu et ça fait chauffé le téléphone pour rien...
                if (deltaDistance > 2 && !this.configService.freezeMapRenderer) {
                    this.location = data;
                    this.eventNewLocation.emit(this.getGeojsonPos());
                }
            }, error => {
                console.log(error);
            });

    }

    disableGeolocation() {
        this.subscriptionWatchLocation.unsubscribe();
    }

    heading() {


        window.addEventListener('compassneedscalibration',function(event) {
            console.log('ask user to wave device in a figure-eight motion');  
               event.preventDefault();
        }, true);

        if (this.configService.platforms.indexOf('android') === -1) { // for testing : ionic Serve
            this.headingIsDisable = true;
            this.compassHeading = { magneticHeading: 0, trueHeading: 0, headingAccuracy: 0, timestamp: 0 };
            this.eventNewCompassHeading.emit(this.compassHeading);
        } else {
            // // utilisation l'api native du navigateur
            const options = {
                frequency: 300
            };

            navigator['compass'].watchHeading(data => {
                if (this.gpsIsReady) {
                    // si on a un mouvement d'au moins 4°
                    if (Math.abs(data.magneticHeading - this.compassHeading.magneticHeading) > 4) {
                        // near 360? TODO
                        if (!this.configService.freezeMapRenderer) {
                            this.compassHeading = data;
                            this.eventNewCompassHeading.emit(data);
                        }

                    }
                }
            },
                error => {
                    console.log(error);
                }, options);
        }
    }
    getLocation() {
        return this.location;
    }

    getCoordsPosition() {
        if (this.location && this.location.coords) {
            return [this.location.coords.longitude, this.location.coords.latitude];
        } else {
            return [0, 0];
        }
    }

    getGeojsonPos() {
        const lon = (this.location && this.location.coords) ? this.location.coords.longitude : this.configService.init.lng;
        const lat = (this.location && this.location.coords) ? this.location.coords.latitude : this.configService.init.lat;
        const accuracy = (this.location && this.location.coords) ? this.location.coords.accuracy : 0;
        const heading = this.compassHeading.magneticHeading;

        this.pointGeojson = {
            'type': 'FeatureCollection', 'features': [
                {
                    'geometry': { 'type': 'Point', 'coordinates': [lon, lat] },
                    'properties': {
                        'accuracy': accuracy,
                        'trueHeading': heading
                    }
                }
            ]
        };
        return this.pointGeojson;
    }

    getGeoJSONCirclePosition(points = 64) {
        if (!points) { points = 64; }
        const radiusInKm = this.location.coords.accuracy / 1000;
        const coords = {
            latitude: this.location.coords.latitude,
            longitude: this.location.coords.longitude
        };
        const km = radiusInKm;
        const ret = [];
        const distanceX = km / (111.320 * Math.cos(coords.latitude * Math.PI / 180));
        const distanceY = km / 110.574;

        let theta, x, y;
        for (let i = 0; i < points; i++) {
            theta = (i / points) * (2 * Math.PI);
            x = distanceX * Math.cos(theta);
            y = distanceY * Math.sin(theta);
            ret.push([coords.longitude + x, coords.latitude + y]);
        }
        ret.push(ret[0]);
        return {
            'type': 'FeatureCollection', 'features': [{ 'type': 'Feature', 'geometry': { 'type': 'Polygon', 'coordinates': [ret] } }]
        };
    }


    dontUseLocation() {
        this.configService.init.zoom = 4.8;
        this.forceOpen = true;
        this.configService.config.lockMapHeading = false;
        this.configService.config.followPosition = false;
        this.compassHeading = { magneticHeading: 0, trueHeading: 0, headingAccuracy: 0, timestamp: 0 };
        this.configService.geolocPageIsOpen = false;
        this.configService.eventCloseGeolocPage.emit('force');
    }
}
