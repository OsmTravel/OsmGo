import { inject, Service } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { TagsService } from '@services/tags.service'
import { forkJoin, of } from 'rxjs'
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators'
import { OsmApiService } from './osmApi.service'

@Service()
export class InitService {
    readonly configService = inject(ConfigService)
    readonly tagsService = inject(TagsService)
    readonly dataService = inject(DataService)
    private readonly translate = inject(TranslateService)
    private readonly osmApi = inject(OsmApiService)

    isLoaded = false
    /**
     * Load config, tags, etc...
     */
    initLoadData$(
        centerOnStart?: number[],
        zoomOnStart?: number,
        idOsmObjectOnStart?: string
    ) {
        const config$ = this.configService.getI18nConfig$().pipe(
            switchMap((i18nConfig) =>
                this.configService.loadConfig$(i18nConfig)
            ),
            shareReplay({ bufferSize: 1, refCount: true })
        )

        return forkJoin({
            config: config$,
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

            osmState: this.dataService.loadOsmState$(),
            objectOnStartCoords: idOsmObjectOnStart
                ? config$.pipe(
                      switchMap(() =>
                          this.osmApi.getFirstCoordFromIdObject$(
                              idOsmObjectOnStart
                          )
                      ),
                      catchError(() => of(undefined))
                  )
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
                this.translate.use(this.configService.config().languageUi)
            })
        )
    }
}
