import { TestBed } from '@angular/core/testing'
import { TranslateService } from '@ngx-translate/core'
import { AppStorage } from '@services/app-storage.service'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { TagsService } from '@services/tags.service'
import { UploadCoordinatorService } from '@services/upload-coordinator.service'
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
            userInfo: vi.fn(() => ({
                uid: '',
                display_name: '',
                connected: false,
            })),
            getChangeset: vi.fn(() => ({
                id: '',
                last_changeset_activity: 0,
                created_at: 0,
                comment: '',
            })),
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
        const uploadCoordinator = {
            recoverJournal: vi.fn(async () => ({ kind: 'idle' })),
        }
        const translate = { use: vi.fn() }
        const storage = { remove: vi.fn(async () => undefined) }

        TestBed.configureTestingModule({
            providers: [
                InitService,
                { provide: ConfigService, useValue: configService },
                { provide: TagsService, useValue: tagsService },
                { provide: DataService, useValue: dataService },
                { provide: OsmApiService, useValue: osmApi },
                {
                    provide: UploadCoordinatorService,
                    useValue: uploadCoordinator,
                },
                { provide: AppStorage, useValue: storage },
                { provide: TranslateService, useValue: translate },
            ],
        })

        return {
            service: TestBed.inject(InitService),
            configService,
            tagsService,
            dataService,
            osmApi,
            uploadCoordinator,
            storage,
        }
    }

    it('loads the selected API environment before resolving a linked object', async () => {
        const { service, configService, osmApi, uploadCoordinator } =
            configure()

        const result = await firstValueFrom(
            service.initLoadData$(undefined, undefined, 'node/4330907486')
        )

        expect(configService.loadConfig$).toHaveBeenCalledOnce()
        expect(osmApi.getFirstCoordFromIdObject$).toHaveBeenCalledWith(
            'node/4330907486'
        )
        expect(uploadCoordinator.recoverJournal).toHaveBeenCalledOnce()
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

    it('uses isolated fallbacks when optional startup resources fail', async () => {
        const { service, configService, tagsService } = configure()
        configService.getCountryConfig$.mockReturnValue(
            throwError(() => new Error('country unavailable'))
        )
        configService.loadUserInfo$.mockReturnValue(
            throwError(() => new Error('storage unavailable'))
        )
        tagsService.loadJsonSprites$.mockReturnValue(
            throwError(() => new Error('sprites unavailable'))
        )
        tagsService.loadBookMarksIds$.mockReturnValue(
            throwError(() => new Error('bookmarks unavailable'))
        )

        const result = await firstValueFrom(service.initLoadData$())

        expect(result.country).toEqual([])
        expect(result.jsonSprites).toEqual({})
        expect(result.bookMarksIds).toEqual([])
        expect(service.isLoaded).toBe(true)
        expect(service.loading()).toBe(false)
        expect(service.fatalError()).toBeNull()
        expect(service.recoverableIssues()).toEqual([
            'country',
            'userInfo',
            'jsonSprites',
            'bookMarksIds',
        ])
    })

    it('stops on a missing required tag catalog and finalizes loading', async () => {
        const { service, tagsService, uploadCoordinator } = configure()
        tagsService.loadTags$.mockReturnValue(
            throwError(() => new Error('tags unavailable'))
        )

        await expect(firstValueFrom(service.initLoadData$())).rejects.toThrow(
            'Could not load required startup resource: tags.'
        )

        expect(service.isLoaded).toBe(false)
        expect(service.loading()).toBe(false)
        expect(service.fatalError()).toEqual({
            resource: 'tags',
            canResetLocalData: false,
            messageKey: 'MAIN.STARTUP.REQUIRED_RESOURCE_FAILED',
        })
        expect(uploadCoordinator.recoverJournal).not.toHaveBeenCalled()
    })

    it('offers a targeted reset when the persisted OSM state is unreadable', async () => {
        const { service, dataService, storage } = configure()
        dataService.loadOsmState$.mockReturnValue(
            throwError(() => new Error('invalid persisted state'))
        )

        await expect(firstValueFrom(service.initLoadData$())).rejects.toThrow(
            'Could not load required startup resource: osmState.'
        )

        expect(service.fatalError()).toMatchObject({
            resource: 'osmState',
            canResetLocalData: true,
            messageKey: 'MAIN.STARTUP.CORRUPTED_STORAGE',
        })

        await service.resetFatalResource()
        expect(storage.remove).toHaveBeenCalledWith('osmState')
    })

    it('recovers the upload journal before marking startup as loaded', async () => {
        const { service, uploadCoordinator } = configure()
        uploadCoordinator.recoverJournal.mockImplementation(async () => {
            expect(service.isLoaded).toBe(false)
            return { kind: 'idle' }
        })

        await firstValueFrom(service.initLoadData$())

        expect(uploadCoordinator.recoverJournal).toHaveBeenCalledOnce()
        expect(service.isLoaded).toBe(true)
    })
})
