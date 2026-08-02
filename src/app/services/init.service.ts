import { inject, Service, signal } from '@angular/core'
import { AppStorage } from '@services/app-storage.service'
import type { Config } from '@services/config.service'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { OSM_STATE_STORAGE_KEY } from '@services/osm-state'
import { TagsService } from '@services/tags.service'
import { UploadCoordinatorService } from '@services/upload-coordinator.service'
import { defer, forkJoin, from, type Observable, of, throwError } from 'rxjs'
import {
    catchError,
    finalize,
    map,
    shareReplay,
    switchMap,
    tap,
} from 'rxjs/operators'
import { OsmApiService } from './osmApi.service'

type StartupResource =
    | 'config'
    | 'country'
    | 'userInfo'
    | 'changeSet'
    | 'savedFields'
    | 'jsonSprites'
    | 'presets'
    | 'tags'
    | 'bookMarksIds'
    | 'lastTagsUsedIds'
    | 'hiddenTagsIds'
    | 'osmState'
    | 'uploadJournal'

export interface StartupFatalError {
    resource: 'tags' | 'osmState' | 'uploadJournal'
    canResetLocalData: boolean
    messageKey: string
}

class RequiredStartupResourceError extends Error {
    constructor(
        readonly resource: StartupFatalError['resource'],
        options: ErrorOptions
    ) {
        super(`Could not load required startup resource: ${resource}.`, options)
    }
}

@Service()
export class InitService {
    readonly configService = inject(ConfigService)
    readonly tagsService = inject(TagsService)
    readonly dataService = inject(DataService)
    private readonly storage = inject(AppStorage)
    private readonly osmApi = inject(OsmApiService)
    private readonly uploadCoordinator = inject(UploadCoordinatorService)

    isLoaded = false
    private readonly loadingState = signal(false)
    readonly loading = this.loadingState.asReadonly()
    private readonly recoverableIssuesState = signal<StartupResource[]>([])
    readonly recoverableIssues = this.recoverableIssuesState.asReadonly()
    private readonly fatalErrorState = signal<StartupFatalError | null>(null)
    readonly fatalError = this.fatalErrorState.asReadonly()

    private recover<T>(
        resource: StartupResource,
        source: Observable<T>,
        fallback: T
    ): Observable<T> {
        return source.pipe(
            catchError((error) => {
                console.warn(
                    `Using the startup fallback for ${resource}.`,
                    error
                )
                this.recoverableIssuesState.update((issues) =>
                    issues.includes(resource) ? issues : [...issues, resource]
                )
                return of(fallback)
            })
        )
    }

    private required<T>(
        resource: StartupFatalError['resource'],
        source: Observable<T>
    ): Observable<T> {
        return source.pipe(
            catchError((cause) =>
                throwError(
                    () => new RequiredStartupResourceError(resource, { cause })
                )
            )
        )
    }

    async resetFatalResource(): Promise<void> {
        if (!this.fatalError()?.canResetLocalData) return
        await this.storage.remove(OSM_STATE_STORAGE_KEY)
    }

    /**
     * Load config, tags, etc...
     */
    initLoadData$(
        centerOnStart?: number[],
        zoomOnStart?: number,
        idOsmObjectOnStart?: string
    ) {
        return defer(() => {
            this.isLoaded = false
            this.loadingState.set(true)
            this.fatalErrorState.set(null)
            this.recoverableIssuesState.set([])

            const config$ = this.recover(
                'config',
                this.configService
                    .getI18nConfig$()
                    .pipe(
                        switchMap((i18nConfig) =>
                            this.configService.loadConfig$(i18nConfig)
                        )
                    ),
                this.configService.config()
            ).pipe(shareReplay({ bufferSize: 1, refCount: true }))

            return forkJoin({
                config: config$,
                country: this.recover(
                    'country',
                    this.configService.getCountryConfig$(),
                    []
                ),
                userInfo: this.recover(
                    'userInfo',
                    this.configService.loadUserInfo$(),
                    this.configService.userInfo()
                ),
                changeSet: this.recover(
                    'changeSet',
                    this.configService.loadChangeSet$(),
                    this.configService.getChangeset()
                ),
                savedFields: this.recover(
                    'savedFields',
                    this.tagsService.loadSavedFields$(),
                    {}
                ),

                jsonSprites: this.recover(
                    'jsonSprites',
                    this.tagsService.loadJsonSprites$(),
                    {}
                ),
                presets: this.recover(
                    'presets',
                    this.tagsService.loadPresets$(),
                    {}
                ),
                tags: this.required('tags', this.tagsService.loadTags$()),

                bookMarksIds: this.recover(
                    'bookMarksIds',
                    this.tagsService.loadBookMarksIds$(),
                    []
                ),
                lastTagsUsedIds: this.recover(
                    'lastTagsUsedIds',
                    this.tagsService.loadLastTagsUsedIds$(),
                    []
                ),
                hiddenTagsIds: this.recover(
                    'hiddenTagsIds',
                    this.tagsService.loadHiddenTagsIds$(),
                    []
                ),

                osmState: this.required(
                    'osmState',
                    this.dataService.loadOsmState$()
                ),
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
                    const config: Config = {
                        ...d.config,
                        lastView: { ...d.config.lastView },
                    }
                    if (d.objectOnStartCoords) {
                        centerOnStart = [
                            d.objectOnStartCoords.lon,
                            d.objectOnStartCoords.lat,
                        ]
                        config.lastView.zoom = 20
                        config.centerWhenGpsIsReady = false
                    }

                    if (centerOnStart) {
                        config.lastView.lng = centerOnStart[0]
                        config.lastView.lat = centerOnStart[1]
                        config.lastView.zoom = 20
                        config.centerWhenGpsIsReady = false
                    }

                    if (zoomOnStart) {
                        config.lastView.zoom = zoomOnStart
                    }

                    return { ...d, config }
                }),
                switchMap((data) =>
                    this.required(
                        'uploadJournal',
                        from(this.uploadCoordinator.recoverJournal())
                    ).pipe(map(() => data))
                ),
                tap(() => {
                    this.isLoaded = true
                    this.configService.applyUiLanguage(
                        this.configService.config().languageUi
                    )
                }),
                catchError((error: unknown) => {
                    const resource =
                        error instanceof RequiredStartupResourceError
                            ? error.resource
                            : 'tags'
                    this.fatalErrorState.set({
                        resource,
                        canResetLocalData:
                            resource === 'osmState' ||
                            resource === 'uploadJournal',
                        messageKey:
                            resource === 'osmState'
                                ? 'MAIN.STARTUP.CORRUPTED_STORAGE'
                                : 'MAIN.STARTUP.REQUIRED_RESOURCE_FAILED',
                    })
                    return throwError(() => error)
                }),
                finalize(() => this.loadingState.set(false))
            )
        })
    }
}
