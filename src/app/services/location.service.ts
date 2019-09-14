import { Injectable, EventEmitter } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { DeviceOrientation, DeviceOrientationCompassHeading } from '@ionic-native/device-orientation/ngx';

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
    compassHeading = { magneticHeading: null, trueHeading: null, headingAccuracy: null, timestamp: null };

    gpsIsReady = false;
    subscriptionLocation;
    subscriptionWatchLocation;
    forceOpen = false; // l'utilisateur a fait le choix d'ouvrir l'app sans geoloc
    headingIsDisable = false;

    constructor(
        private geolocation: Geolocation,
        private deviceOrientation: DeviceOrientation,
        public configService: ConfigService) {

        this.eventPlatformReady.subscribe( () => {
            this.enableGeolocation();
 
              
            
            this.heading();
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


                if (!this.location) {
                    this.location = data;
                    this.eventNewLocation.emit(this.getGeojsonPos());
                } else if (data && data.coords && !this.configService.freezeMapRenderer) {
                    const deltaLat = Math.abs(data.coords.latitude - this.location.coords.latitude);
                    const deltaLng = Math.abs(data.coords.longitude - this.location.coords.longitude)
                    const deltaAccuracy = Math.abs(data.coords.accuracy - this.location.coords.accuracy)
                    if (deltaLat > 0.00001 || deltaLng > 0.00001 || deltaAccuracy > 4) {
                        this.location = data;
                        this.eventNewLocation.emit(this.getGeojsonPos());
                    }
                }

            }, error => {
                
                console.log(error);
            });

    }

    disableGeolocation() {
        this.subscriptionWatchLocation.unsubscribe();
    }

    convertToCompassHeading(alpha, beta, gamma) {
        // Convert degrees to radians
        var alphaRad = alpha * (Math.PI / 180);
        var betaRad = beta * (Math.PI / 180);
        var gammaRad = gamma * (Math.PI / 180);

        // Calculate equation components
        var cA = Math.cos(alphaRad);
        var sA = Math.sin(alphaRad);
        var cB = Math.cos(betaRad);
        var sB = Math.sin(betaRad);
        var cG = Math.cos(gammaRad);
        var sG = Math.sin(gammaRad);

        // Calculate A, B, C rotation components
        var rA = - cA * sG - sA * sB * cG;
        var rB = - sA * sG + cA * sB * cG;
        var rC = - cB * cG;

        // Calculate compass heading
        var compassHeading = Math.atan(rA / rB);

        // Convert from half unit circle to whole unit circle
        if (rB < 0) {
            compassHeading += Math.PI;
        } else if (rA < 0) {
            compassHeading += 2 * Math.PI;
        }

        // Convert radians to degrees
        compassHeading *= 180 / Math.PI;
        return compassHeading;

    }

    heading() {
  
        if (this.configService.device.platform){
            
            const subscription = this.deviceOrientation.watchHeading({frequency: 300}).subscribe(
                (data) => {
                    if (!this.configService.freezeMapRenderer) {
                        if (!this.compassHeading.magneticHeading || Math.abs(data.trueHeading - this.compassHeading.trueHeading) > 4) {
                            // near 360? TODO
                            if (!this.configService.freezeMapRenderer) {
                                this.compassHeading = data;
                                this.eventNewCompassHeading.emit(data);
                            }
                        }
                    }
                }
              );
        }
   
        else {
            window.addEventListener("deviceorientationabsolute", (event:any) => {
                if (!event.alpha  || !event.beta || !event.gamma){
                    return;
                }
                const compass = this.convertToCompassHeading(event.alpha, event.beta, event.gamma);
              
                let newCompassHeading = {
                    magneticHeading: compass,
                    trueHeading: compass,
                    headingAccuracy: null,
                    timestamp: null,
                }
    
                if (!this.configService.freezeMapRenderer) {
                    if (!this.compassHeading.magneticHeading || Math.abs(compass - this.compassHeading.magneticHeading) > 4) {
                        // near 360? TODO
                        if (!this.configService.freezeMapRenderer) {
                            this.compassHeading = newCompassHeading;
                            this.eventNewCompassHeading.emit(newCompassHeading);
                        }
                    }
                }
            }, true);
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