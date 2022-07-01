import { Injectable } from '@angular/core'
import { forkJoin } from 'rxjs'
import { ConfigService } from './config.service'
import { TagsService } from './tags.service'
import { switchMap, tap } from 'rxjs/operators'
import { TranslateService } from '@ngx-translate/core'
import { DataService } from './data.service'

@Injectable({
    providedIn: 'root',
})
export class InitService {
    isLoaded = false

    constructor(
        public configService: ConfigService,
        public tagsService: TagsService,
        public dataService: DataService,
        private translate: TranslateService
    ) {}
    /**
     * Load config, tags, etc...
     */
    initLoadData$() {
        return forkJoin(
            this.configService
                .getI18nConfig$()
                .pipe(
                    switchMap((i18nConfig) =>
                        this.configService.loadConfig$(i18nConfig)
                    )
                ),
            this.configService.loadUserInfo$(),
            this.configService.loadChangeSet$(),
            this.tagsService.loadSavedFields$(),

            this.tagsService.loadJsonSprites$(),
            this.tagsService.loadPresets$(),
            this.tagsService.loadTags$(),

            this.tagsService.loadBookMarksIds$(),
            this.tagsService.loadLastTagsUsedIds$(),
            this.tagsService.loadHiddenTagsIds$(),

            this.dataService.loadGeojson$(),
            this.dataService.loadGeojsonChanged$(),
            this.dataService.loadGeojsonBbox$()
        ).pipe(
            tap(() => {
                this.isLoaded = true
                this.translate.use(this.configService.config.languageUi)
            })
        )
    }
}
