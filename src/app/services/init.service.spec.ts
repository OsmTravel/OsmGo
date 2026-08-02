import { TestBed } from '@angular/core/testing'
import { TranslateService } from '@ngx-translate/core'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { TagsService } from '@services/tags.service'
import { firstValueFrom, of, throwError, timer } from 'rxjs'
import { map } from 'rxjs/operators'
import { InitService } from './init.service'
import { OsmApiService } from './osmApi.service'

describe('InitService', () => {
    const emptyCollection = { type: 'FeatureCollection', features: [] }
    const config = {
        languageUi: 'fr',
        isDevServer: true,
        lastView: { lng: 2, lat: 48, zoom: 18, bearing: 0 },
        centerWhenGpsIsReady: true,
    }

    function configure(coordinateResult = of({ lon: 5.744, lat: 45.186 })) {
        let configLoaded = false
        const configService = {
            getI18nConfig$: vi.fn(() => of({ language: ['fr'] })),
            loadConfig$: vi.fn(() =>
                timer(1).pipe(
                    map(() => {
                        configLoaded = true
                        return structuredClone(config)
                    })
                )
            ),
            getCountryConfig$: vi.fn(() => of([])),
            loadUserInfo$: vi.fn(() => of(undefined)),
            loadChangeSet$: vi.fn(() => of(undefined)),
            config: vi.fn(() => config),
        }
        const tagsService = {
            loadSavedFields$: vi.fn(() => of([])),
            loadJsonSprites$: vi.fn(() => of({})),
            loadPresets$: vi.fn(() => of({})),
            loadTags$: vi.fn(() => of([])),
            loadBookMarksIds$: vi.fn(() => of([])),
            loadLastTagsUsedIds$: vi.fn(() => of([])),
            loadHiddenTagsIds$: vi.fn(() => of([])),
        }
        const dataService = {
            loadOsmState$: vi.fn(() =>
                of({
                    schemaVersion: 2,
                    revision: 0,
                    officialById: {},
                    pendingById: {},
                    bbox: emptyCollection,
                    nextTemporaryId: -1,
                })
            ),
        }
        const osmApi = {
            getFirstCoordFromIdObject$: vi.fn(() => {
                expect(configLoaded).toBe(true)
                return coordinateResult
            }),
        }
        const translate = { use: vi.fn() }

        TestBed.configureTestingModule({
            providers: [
                InitService,
                { provide: ConfigService, useValue: configService },
                { provide: TagsService, useValue: tagsService },
                { provide: DataService, useValue: dataService },
                { provide: OsmApiService, useValue: osmApi },
                { provide: TranslateService, useValue: translate },
            ],
        })

        return {
            service: TestBed.inject(InitService),
            configService,
            osmApi,
        }
    }

    it('loads the selected API environment before resolving a linked object', async () => {
        const { service, configService, osmApi } = configure()

        const result = await firstValueFrom(
            service.initLoadData$(undefined, undefined, 'node/4330907486')
        )

        expect(configService.loadConfig$).toHaveBeenCalledOnce()
        expect(osmApi.getFirstCoordFromIdObject$).toHaveBeenCalledWith(
            'node/4330907486'
        )
        expect(result.config.lastView).toMatchObject({
            lng: 5.744,
            lat: 45.186,
            zoom: 20,
        })
    })

    it('still initializes the app when a linked object has no coordinates', async () => {
        const { service } = configure(
            throwError(() => new Error('No coordinates found'))
        )

        const result = await firstValueFrom(
            service.initLoadData$(undefined, undefined, 'node/missing')
        )

        expect(result.objectOnStartCoords).toBeUndefined()
        expect(result.config.lastView).toMatchObject({ lng: 2, lat: 48 })
        expect(service.isLoaded).toBe(true)
    })
})
