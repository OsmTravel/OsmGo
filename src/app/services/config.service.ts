import { Injectable, EventEmitter } from '@angular/core'
import { Storage } from '@ionic/storage-angular'
import { HttpClient } from '@angular/common/http'
import { TranslateService } from '@ngx-translate/core'
import { environment } from '@environments/environment.prod'
import { Platform } from '@ionic/angular'
import { map } from 'rxjs/operators'
import { from, Observable } from 'rxjs'
import { TagConfig } from '@osmgo/type'
import { TagsService } from '@services/tags.service'
import { CountryCode } from '@osmgo/type'

export interface User {
    uid: string
    display_name: string
    connected: boolean
}

export interface Changeset {
    id: string
    last_changeset_activity: number
    created_at: number
    comment: string
}

export interface Config {
    mapMarginBuffer: number
    lockMapHeading: boolean
    followPosition: boolean
    defaultPrimarykeyWindows: 'lastTags' | 'bookmarks'
    basemap: any
    filterWayByArea: boolean
    filterWayByLength: boolean
    changeSetComment: string
    languageUi: string
    languageTags: string
    countryTags: string
    oldTagsIcon: { display: boolean; year: number }
    displayFixmeIcon: boolean
    addSurveyDate: boolean
    isDevServer: boolean
    checkedKey: 'survey:date' | 'check_date'
    surveyCard: {
        display: 'never' | 'when_older' | 'always'
        year: number
    }
    isSelectableLine: boolean
    isSelectablePolygon: boolean
    passwordSaved: boolean
    lastView: { lng: number; lat: number; zoom: number; bearing: number }
    centerWhenGpsIsReady: boolean
    limitFeatures: number
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
    constructor(
        public localStorage: Storage,
        private platform: Platform,
        private http: HttpClient,
        private translate: TranslateService
    ) {}
    user_info: User = {
        uid: '',
        display_name: '',
        connected: false,
    }
    changeset: Changeset = {
        id: '',
        last_changeset_activity: 0,
        created_at: 0,
        comment: '',
    }
    i18nConfig
    countryConfig: CountryCode[]

    eventConfigIsLoaded = new EventEmitter()
    freezeMapRenderer = false
    platforms = []
    deviceInfo
    baseMapSources = null
    currentZoom: number = undefined
    selecableLayers: string[] = ['marker', 'marker_changed', 'icon-change']

    defautBaseMap: any = {
        default: true,
        description: 'Satellite and aerial imagery.',
        i18n: true,
        icon: 'https://osmlab.github.io/editor-layer-index/sources/world/Bing.png',
        id: 'Bing',
        license_url: 'https://wiki.openstreetmap.org/wiki/Bing_Maps',
        max_zoom: 22,
        min_zoom: 1,
        name: 'Bing Maps Aerial',
        no_tile_header: { 'X-VE-Tile-Info': ['no-tile'] },
        permission_osm: 'explicit',
        privacy_policy_url: 'https://privacy.microsoft.com/privacystatement',
        type: 'bing',
        url: 'https://www.bing.com/maps',
        tiles: [
            'https://ecn.t0.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=587&mkt=en-gb&n=z',
            'https://ecn.t1.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=587&mkt=en-gb&n=z',
            'https://ecn.t2.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=587&mkt=en-gb&n=z',
            'https://ecn.t3.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=587&mkt=en-gb&n=z',
        ],
    }

    config: Config = {
        mapMarginBuffer: 50,
        lockMapHeading: true,
        followPosition: true,
        defaultPrimarykeyWindows: 'lastTags',
        basemap: this.defautBaseMap,
        filterWayByArea: true,
        filterWayByLength: true,
        changeSetComment: '',
        languageUi: window.navigator.language.split('-')[0] || null,
        languageTags: window.navigator.language.split('-')[0] || null,
        countryTags:
            window.navigator.language && window.navigator.language.split('-')[1]
                ? window.navigator.language.split('-')[1].toUpperCase()
                : null,
        oldTagsIcon: { display: true, year: 4 },
        displayFixmeIcon: true,
        addSurveyDate: true,
        isDevServer: false,
        checkedKey: 'survey:date',
        surveyCard: {
            display: 'always',
            year: 4,
        },
        isSelectableLine: true,
        isSelectablePolygon: false,
        passwordSaved: true,
        lastView: { lng: -0.127758, lat: 51.507351, zoom: 18, bearing: 0 }, // London
        centerWhenGpsIsReady: true,
        limitFeatures: 10000,
    }

    currentTagsCountryChoice = []

    geojsonIsLoadedFromCache = false

    appVersion = {
        appName: 'Osm Go!',
        appVersionCode: '12',
        appVersionNumber: environment.version || '0.0.0',
        platform: environment.platform || undefined,
        branch: environment.branch || undefined,
        shortHash: environment.shortHash || undefined,
    }

    getUserInfo() {
        return this.user_info
    }

    setUserInfo(_user_info) {
        this.user_info = _user_info
        this.localStorage.set('user_info', this.user_info)
    }

    resetUserInfo() {
        this.user_info = {
            uid: '',
            display_name: '',
            connected: false,
        }
        this.localStorage.set('user_info', this.user_info)
    }

    getChangeset(): Changeset {
        return this.changeset
    }

    setChangeset(_id: string, _created_at, _last_changeset_activity, _comment) {
        // alimente changeset + localstorage
        this.changeset = {
            id: _id,
            last_changeset_activity: _last_changeset_activity,
            created_at: _created_at,
            comment: _comment,
        } // to do => ajouter le serveur?
        this.localStorage.set('changeset', this.changeset)
    }

    updateChangesetLastActivity() {
        const time = Date.now()
        this.changeset.last_changeset_activity = time
        this.localStorage.set('last_changeset_activity', time.toString())
    }

    getI18nConfig$() {
        return this.http.get('./assets/i18n/i18n.json').pipe(
            map((i18nConfig) => {
                this.i18nConfig = i18nConfig
                return i18nConfig
            })
        )
    }

    getCountryConfig$(): Observable<CountryCode[]> {
        return this.http.get('./assets/countryCode.json').pipe(
            map((countryCode: CountryCode[]) => {
                this.countryConfig = countryCode
                return countryCode
            })
        )
    }

    loadConfig$(_i18nConfig): Observable<Config> {
        return from(this.localStorage.get('config')).pipe(
            map((d) => {
                if (d) {
                    // tslint:disable-next-line:forin
                    for (const key in d) {
                        this.config[key] = d[key]
                    }
                } else {
                    this.localStorage.set('config', this.config)
                }

                this.config.languageTags = this.config.languageTags || 'en'
                this.config.countryTags = this.config.countryTags || 'GB'

                this.setIsSelectableLine(this.config.isSelectableLine)
                this.setIsSelectablePolygon(this.config.isSelectablePolygon)

                return this.config
            })
        )
    }

    loadUserInfo$() {
        return from(this.localStorage.get('user_info')).pipe(
            map((userInfo) => {
                if (userInfo && userInfo.connected) {
                    this.user_info = userInfo
                } else {
                    this.user_info = {
                        uid: '',
                        display_name: '',
                        connected: false,
                    }
                }
                return this.user_info
            })
        )
    }

    loadChangeSet$() {
        return from(this.localStorage.get('changeset')).pipe(
            map((changeset) => {
                if (changeset) {
                    this.changeset = changeset
                } else {
                    this.changeset = {
                        id: '',
                        last_changeset_activity: 0,
                        created_at: 0,
                        comment: this.getChangeSetComment(),
                    }
                }
                return this.changeset
            })
        )
    }

    // TODO: add userInfo
    loadConfig2$(_i18nConfig) {
        return from(this.localStorage.get('config')).pipe(
            map(async (d) => {
                if (d) {
                    // tslint:disable-next-line:forin
                    for (const key in d) {
                        this.config[key] = d[key]
                    }
                } else {
                    this.localStorage.set('config', this.config)
                }

                this.config.languageTags = this.config.languageTags || 'en'
                this.config.countryTags = this.config.countryTags || 'GB'

                this.setIsSelectableLine(this.config.isSelectableLine)
                this.setIsSelectablePolygon(this.config.isSelectablePolygon)

                let userInfo = await this.localStorage.get('user_info')
                if (userInfo && userInfo.connected) {
                    this.user_info = userInfo
                } else {
                    this.user_info = {
                        uid: '',
                        display_name: '',
                        connected: false,
                    }
                }

                let changeset: Changeset = await this.localStorage.get(
                    'changeset'
                )
                if (changeset) {
                    this.changeset = changeset
                } else {
                    this.changeset = {
                        id: '',
                        last_changeset_activity: 0,
                        created_at: 0,
                        comment: this.getChangeSetComment(),
                    }
                }
                console.log({
                    config: this.config,
                    user_info: this.user_info,
                    changeset: this.changeset,
                })
                return {
                    config: this.config,
                    user_info: this.user_info,
                    changeset: this.changeset,
                }
            })
        )
    }

    async loadAppVersion() {
        this.appVersion.appVersionNumber = environment.version
        console.log(this.appVersion)
    }

    getAppVersion() {
        return this.appVersion
    }

    //Osm Go! 1.6.2-dev PWA
    getAppFullVersion() {
        const isDev = this.appVersion.branch === 'develop'
        const platform = this.appVersion.platform
        return `${this.appVersion.appName} ${this.appVersion.appVersionNumber}${
            isDev ? '-dev' : ''
        } ${platform ? platform : ''}`
    }

    setMapMarginBuffer(buffer: number) {
        this.config.mapMarginBuffer = buffer
        this.localStorage.set('config', this.config)
    }
    getMapMarginBuffer() {
        return this.config.mapMarginBuffer
    }

    setLimitFeatures(limit: number) {
        this.config.limitFeatures = limit
        this.localStorage.set('config', this.config)
    }
    getLimitFeatures() {
        return this.config.limitFeatures
    }

    setChangeSetComment(comment: string) {
        this.config.changeSetComment = comment
        this.localStorage.set('config', this.config)
    }
    getChangeSetComment() {
        return this.config.changeSetComment
    }

    setLockMapHeading(isLockMapHeading: boolean) {
        this.config.lockMapHeading = isLockMapHeading
        this.localStorage.set('config', this.config)
    }
    getLockMapHeading() {
        return this.config.lockMapHeading
    }

    setFollowPosition(isFollowingPosition: boolean) {
        this.config.followPosition = isFollowingPosition
        this.localStorage.set('config', this.config)
    }
    getFollowPosition() {
        return this.config.followPosition
    }

    setDefaultPrimarykeyWindows(
        defaultPrimarykeyWindows: 'lastTags' | 'bookmarks'
    ) {
        this.config.defaultPrimarykeyWindows = defaultPrimarykeyWindows
        this.localStorage.set('config', this.config)
    }

    getDefaultPrimarykeyWindows() {
        return this.config.defaultPrimarykeyWindows
    }

    setBasemap(basemap: any) {
        this.config.basemap = basemap
        this.localStorage.set('config', this.config)
    }

    getBasemap() {
        return this.config.basemap
    }

    /* Boolean, activé ou pas */
    setFilterWayByArea(enable: boolean) {
        this.config.filterWayByArea = enable
        this.localStorage.set('config', this.config)
    }
    getFilterWayByArea() {
        return this.config.filterWayByArea
    }

    setFilterWayByLength(enable: boolean) {
        this.config.filterWayByLength = enable
        this.localStorage.set('config', this.config)
    }

    getFilterWayByLength() {
        return this.config.filterWayByLength
    }

    setUiLanguage(lang: string) {
        this.config.languageUi = lang
        this.translate.use(lang)
        this.localStorage.set('config', this.config)
    }

    getUiLanguage() {
        return this.config.languageUi
    }

    setLanguageTags(lang: string) {
        this.config.languageTags = lang
        // this.currentTagsCountryChoice = this.i18nConfig.tags.find(l => l.language == lang).country;
        // this.config.countryTags = this.currentTagsCountryChoice[0].region;
        this.localStorage.set('config', this.config)
    }

    setCountryTags(country: string) {
        this.config.countryTags = country
        this.localStorage.set('config', this.config)
    }

    getOldTagsIcon() {
        return this.config.oldTagsIcon
    }

    setOldTagsIcon(display: boolean, year: number) {
        this.config.oldTagsIcon = { display: display, year: year }
        this.localStorage.set('config', this.config)
    }

    getDisplayFixmeIcon() {
        return this.config.displayFixmeIcon
    }

    setDisplayFixmeIcon(display: boolean) {
        this.config.displayFixmeIcon = display
        this.localStorage.set('config', this.config)
    }

    getAddSurveyDate() {
        return this.config.addSurveyDate
    }

    setAddSurveyDate(add: boolean) {
        this.config.addSurveyDate = add
        this.localStorage.set('config', this.config)
    }

    getCheckedKey(): 'survey:date' | 'check_date' {
        return this.config.checkedKey
    }

    setCheckedKey(key: 'survey:date' | 'check_date') {
        this.config.checkedKey = key
        this.localStorage.set('config', this.config)
    }

    getDisplaySurveyCard(): 'never' | 'when_older' | 'always' {
        return this.config.surveyCard.display
    }

    setDisplaySurveyCard(value: 'never' | 'when_older' | 'always') {
        this.config.surveyCard.display = value
        this.localStorage.set('config', this.config)
    }

    getSurveyCardYear(): number {
        return this.config.surveyCard.year
    }

    setSurveyCardYear(value: number) {
        this.config.surveyCard.year = value
        this.localStorage.set('config', this.config)
    }

    getIsDevServer() {
        return this.config.isDevServer
    }

    setIsSelectableLine(isSelectableLine: boolean) {
        const layers = ['way_line', 'way_line_changed'] // way_line_changed TODO: add properties...
        this.config.isSelectableLine = isSelectableLine
        this.localStorage.set('config', this.config)
        let newSelectableLayers = this.selecableLayers.filter(
            (l) => !layers.includes(l)
        )
        if (isSelectableLine) {
            newSelectableLayers = [...newSelectableLayers, ...layers]
        }
        this.selecableLayers = [...newSelectableLayers]
    }

    setIsSelectablePolygon(isSelectablePolygon: boolean) {
        const layers = ['way_fill', 'way_fill_changed'] //   TODO: add properties...
        this.config.isSelectablePolygon = isSelectablePolygon
        this.localStorage.set('config', this.config)
        let newSelectableLayers = this.selecableLayers.filter(
            (l) => !layers.includes(l)
        )
        if (isSelectablePolygon) {
            newSelectableLayers = [...newSelectableLayers, ...layers]
        }
        this.selecableLayers = [...newSelectableLayers]
    }

    async setIsDevServer(isDevServer: boolean) {
        this.config.isDevServer = isDevServer
        await this.localStorage.set('config', this.config)
        await this.localStorage.remove('geojson')
        await this.localStorage.remove('geojsonBbox')
        await this.localStorage.remove('user_info')
        await this.localStorage.remove('geojsonChanged')
        return isDevServer
    }

    setPasswordSaved(isSaved: boolean) {
        this.config.passwordSaved = isSaved
        this.localStorage.set('config', this.config)
    }

    setCenterWhenGpsIsReady(center: boolean) {
        this.config.centerWhenGpsIsReady = center
        this.localStorage.set('config', this.config)
    }

    setLastView(lastView) {
        this.config.lastView = lastView
        this.localStorage.set('config', this.config)
    }
}
