import { Injectable, EventEmitter } from '@angular/core';
import { Storage } from '@ionic/storage';
import { AppVersion } from '@ionic-native/app-version';

@Injectable()
export class ConfigService {
      constructor(public localStorage: Storage, private _appVersion: AppVersion) { 
    
           this.loadConfig();
      }

    
    eventConfigIsLoaded = new EventEmitter();

    config = {
        mapMarginBuffer: 50,
        mapIsPiched: false,
        lockMapHeading: true,
        followPosition: true,
        defaultPrimarykeyWindows: 'allTags',
        delegateDataConversion: false,
        isDelayed: true
    };

    init = { lng : 2.6,
             lat: 47,
             zoom: 4.8 }

    appVersion = { appName: 'Osm Go!', appVersionCode: '12', appVersionNumber: '0.0.0' }



    loadConfig() {
        this.localStorage.get('config').then(d => {
            if (d) {
                for (let key in d) {
                    this.config[key] = d[key];
                }
            } else {
                this.localStorage.set('config', this.config);
            }
            this.eventConfigIsLoaded.emit(this.config);
        });
    }

    loadAppVersion() {

        this._appVersion.getAppName().then(e => {
            this.appVersion.appName = e;
        });
        this._appVersion.getVersionCode().then(e => {
            this.appVersion.appVersionCode = e;
        });
        this._appVersion.getVersionNumber().then(e => {
            this.appVersion.appVersionNumber = e;
        });


    }

    getAppVersion() {
        return this.appVersion;
    }


    setMapMarginBuffer(buffer: number) {
        this.config.mapMarginBuffer = buffer;
        this.localStorage.set('config', this.config);
    }
    getMapMarginBuffer() {
        return this.config.mapMarginBuffer;
    }



    setMapIsPiched(pitched: boolean) {
        this.config.mapIsPiched = pitched;
        this.localStorage.set('config', this.config);
    }
    getMapIsPiched() {
        return this.config.mapIsPiched;
    }


    setLockMapHeading(isLockMapHeading: boolean) {
        this.config.lockMapHeading = isLockMapHeading;
        this.localStorage.set('config', this.config);
    }
    getLockMapHeading() {
        return this.config.lockMapHeading;
    }


    setFollowPosition(isFollowingPosition: boolean) {
        this.config.followPosition = isFollowingPosition;
        this.localStorage.set('config', this.config);
    }
    getFollowPosition() {
        return this.config.followPosition;
    }

    setDefaultPrimarykeyWindows(defaultPrimarykeyWindows: string) {
        this.config.defaultPrimarykeyWindows = defaultPrimarykeyWindows;
        this.localStorage.set('config', this.config);
    }

    getDefaultPrimarykeyWindows() {
        return this.config.defaultPrimarykeyWindows;
    }

    setDelegateDataConversion(delegateDataConversion: boolean) {
        this.config.delegateDataConversion = delegateDataConversion;
        this.localStorage.set('config', this.config);
    }

    getDelegateDataConversion() {
        return this.config.delegateDataConversion;
    }

    setIsDelayed(isDelayed: boolean) {
        this.config.isDelayed = isDelayed;
        this.localStorage.set('config', this.config);
    }

    getIsDelayed() {
        return this.config.isDelayed;
    }



}