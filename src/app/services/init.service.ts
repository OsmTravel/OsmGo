import { Injectable } from '@angular/core'
import { forkJoin, of } from 'rxjs'
import { ConfigService } from '@services/config.service'
import { TagsService } from '@services/tags.service'
import { map, switchMap, tap } from 'rxjs/operators'
import { TranslateService } from '@ngx-translate/core'
import { DataService } from '@services/data.service'
import { OsmApiService } from './osmApi.service'

@Injectable({
    providedIn: 'root',
})
export class InitService {
    isLoaded = false

    constructor(
        public configService: ConfigService,
        public tagsService: TagsService,
        public dataService: DataService,
        private translate: TranslateService,
        private osmApi: OsmApiService
    ) {}
    /**
     * Load config, tags, etc...
     */
    initLoadData$(
        centerOnStart?: number[],
        zoomOnStart?: number,
        idOsmObjectOnStart?: string
    ) {
        return forkJoin({
            config: this.configService
                .getI18nConfig$()
                .pipe(
                    switchMap((i18nConfig) =>
                        this.configService.loadConfig$(i18nConfig)
                    )
                ),
            country: this.configService.getCountryConfig$(),
            userInfo: this.configService.loadUserInfo$(),
            changeSet: this.configService.loadChangeSet$(),
            savedFields: this.tagsService.loadSavedFields$(),

            jsonSprites: this.tagsService.loadJsonSprites$(),
            presets: this.tagsService.loadPresets$(),
            tags: this.tagsService.loadTags$(),

            bookMarksIds: this.tagsService.loadBookMarksIds$(),
            lastTagsUsedIds: this.tagsService.loadLastTagsUsedIds$(),
            hiddenTagsIds: this.tagsService.loadHiddenTagsIds$(),

            geojson: this.dataService.loadGeojson$(),
            geojsonChanged: this.dataService.loadGeojsonChanged$(),
            geojsonBbox: this.dataService.loadGeojsonBbox$(),
            objectOnStartCoords: idOsmObjectOnStart
                ? this.osmApi.getFirstCoordFromIdObject$(idOsmObjectOnStart)
                : of(undefined),
        }).pipe(
            map((d) => {
                if (d.objectOnStartCoords) {
                    centerOnStart = [
                        d.objectOnStartCoords.lon,
                        d.objectOnStartCoords.lat,
                    ]
                    d.config.lastView.zoom = 20
                    d.config.centerWhenGpsIsReady = false
                }

                if (centerOnStart) {
                    d.config.lastView.lng = centerOnStart[0]
                    d.config.lastView.lat = centerOnStart[1]
                    d.config.lastView.zoom = 20
                    d.config.centerWhenGpsIsReady = false
                }

                if (zoomOnStart) {
                    d.config.lastView.zoom = zoomOnStart
                }

                return d
            }),
            tap(() => {
                this.isLoaded = true
                this.translate.use(this.configService.config.languageUi)
            })
        )
    }
}
