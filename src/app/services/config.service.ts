import { Injectable, EventEmitter } from '@angular/core';
import { Storage } from '@ionic/storage';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Plugins } from '@capacitor/core';
import { environment } from '../../environments/environment.prod';

const { Device } = Plugins;

@Injectable({ providedIn: 'root' })
export class ConfigService {
    eventCloseGeolocPage = new EventEmitter();

    constructor(public localStorage: Storage,
        private http: HttpClient,
        private translate: TranslateService
    ) {

        this.getI18nConfig$().subscribe(d => {
            this.i18nConfig = d;
            this.loadConfig();
        });


    }

    i18nConfig;

    eventConfigIsLoaded = new EventEmitter();
    freezeMapRenderer = false;
    platforms = [];

    baseMapSources ;
    currentZoom: number = undefined;

    config = {
        mapMarginBuffer: 50,
        lockMapHeading: true,
        followPosition: true,
        defaultPrimarykeyWindows: 'allTags',
        isDelayed: true,
        baseMapSourceId: this.baseMapSources ? this.baseMapSources[0].id : null,
        filterWayByArea: true,
        filterWayByLength: true,
        changeSetComment: '',
        languageUi: window.navigator.language.split('-')[0] || null,
        languageTags: window.navigator.language.split('-')[0] || null,
        countryTags: window.navigator.language.split('-')[1].toUpperCase() || null
    };

    currentTagsCountryChoice = [];


    geolocPageIsOpen = true;
    geojsonIsLoadedFromCache = false;

    init = {
        lng: 2.6,
        lat: 47,
        zoom: 4.8
    };

    appVersion = { appName: 'Osm Go!', appVersionCode: '12', appVersionNumber: environment.version || '0.0.0' };


    getI18nConfig$() {
        return this.http.get('./assets/i18n/i18n.json')
    }



    loadConfig() {


        return this.localStorage.get('config')
            .then(d => {

                if (d) {
                    // tslint:disable-next-line:forin
                    for (const key in d) {
                        this.config[key] = d[key];
                    }
                } else {
                    this.localStorage.set('config', this.config);
                }


                const currentTagsLanguage = this.i18nConfig.tags.find(l => l.language === this.config.languageTags);
                if (!currentTagsLanguage) {
                    this.config.languageTags = 'en';
                    this.config.countryTags = 'GB';
                } else {
                    if (!currentTagsLanguage.country.find(r => r.region === this.config.countryTags)) {
                        this.config.countryTags = currentTagsLanguage.country[0].region;
                    }
                }
                this.currentTagsCountryChoice = this.i18nConfig.tags.find(l => l.language == this.config.languageTags).country;
                this.eventConfigIsLoaded.emit(this.config);
            });
    }

    loadAppVersion() {
        Device.getInfo()
            .then(e => {
                this.appVersion.appVersionCode = e.appVersion || environment.version;
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

    setChangeSetComment(comment: string) {
        this.config.changeSetComment = comment;
        this.localStorage.set('config', this.config);
    }
    getChangeSetComment() {
        return this.config.changeSetComment;
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


    setIsDelayed(isDelayed: boolean) {
        this.config.isDelayed = isDelayed;
        this.localStorage.set('config', this.config);
    }

    getIsDelayed() {
        return this.config.isDelayed;
    }

    setBaseSourceId(baseMapSourceId: string) {
        this.config.baseMapSourceId = baseMapSourceId;
        this.localStorage.set('config', this.config);
    }

    getBaseMapId() {
        return this.config.baseMapSourceId;
    }

    /* Boolean, activé ou pas */
    setFilterWayByArea(enable: boolean) {
        this.config.filterWayByArea = enable;
        this.localStorage.set('config', this.config);
    }
    getFilterWayByArea() {
        return this.config.filterWayByArea;
    }

    setFilterWayByLength(enable: boolean) {
        this.config.filterWayByLength = enable;
        this.localStorage.set('config', this.config);
    }

    getFilterWayByLength() {
        return this.config.filterWayByLength;
    }

    setUiLanguage(lang: string) {
        this.config.languageUi = lang;
        this.translate.use(lang);
        this.localStorage.set('config', this.config);
    }

    getUiLanguage() {
        return this.config.languageUi;
    }

    setLanguageTags(lang: string) {
        this.config.languageTags = lang;
        this.currentTagsCountryChoice = this.i18nConfig.tags.find(l => l.language == lang).country;
        this.config.countryTags = this.currentTagsCountryChoice[0].region;
        this.localStorage.set('config', this.config);
    }

    setCountryTags(country: string) {
        this.config.countryTags = country;
        this.localStorage.set('config', this.config);
    }

}
