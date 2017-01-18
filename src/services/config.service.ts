import { Injectable, EventEmitter } from '@angular/core';
import { Storage } from '@ionic/storage';
import { AppVersion } from 'ionic-native';

@Injectable()
export class ConfigService {
    localStorage = new Storage();
    eventConfigIsLoaded = new EventEmitter();

    config = {
        mapMarginBuffer: 50,
        mapIsPiched: false,
        lockMapHeading: true,
        followPosition: true,
        defaultPrimarykeyWindows: 'allTags',
        delegateDataConversion: true,
        isDelayed: true
    };
    appVersion = { appName: 'Osm Go!', appVersionCode: 12, appVersionNumber: '0.0.0' }

    constructor() {
        this.loadConfig();

    }

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

        AppVersion.getAppName().then(e => {
            this.appVersion.appName = e;
        });
        AppVersion.getVersionCode().then(e => {
            this.appVersion.appVersionCode = e;
        });
        AppVersion.getVersionNumber().then(e => {
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