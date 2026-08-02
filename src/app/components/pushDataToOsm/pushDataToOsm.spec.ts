import { TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { TranslateService } from '@ngx-translate/core'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { MapService } from '@services/map.service'
import { OsmApiService } from '@services/osmApi.service'
import { OverlayNavigationService } from '@services/overlay-navigation.service'
import { TagsService } from '@services/tags.service'
import { BehaviorSubject, of, Subject, TimeoutError, throwError } from 'rxjs'

import { PushDataToOsmPage, UPLOAD_SUCCESS_DELAY_MS } from './pushDataToOsm'

interface PushPageDependencies {
    dataService: unknown
    configService: unknown
    osmApi?: unknown
    tagsService?: unknown
    mapService?: unknown
    overlayNavigation?: unknown
    dialog?: unknown
    snackBar?: unknown
    translate?: unknown
    successDelayMs?: number
}

describe('PushDataToOsmPage', () => {
    const createProcessingMapService = () => {
        const isProcessing = new BehaviorSubject(false)
        return {
            isProcessing,
            setIsProcessing: (value: boolean) => isProcessing.next(value),
        }
    }

    const createPage = ({
        dataService,
        osmApi = {},
        tagsService = {},
        mapService = {},
        overlayNavigation = { close: vi.fn().mockResolvedValue(true) },
        dialog = {},
        snackBar = {},
        configService,
        translate = {},
        successDelayMs = 0,
    }: PushPageDependencies): PushDataToOsmPage => {
        TestBed.resetTestingModule()
        TestBed.configureTestingModule({
            providers: [
                { provide: DataService, useValue: dataService },
                { provide: OsmApiService, useValue: osmApi },
                { provide: TagsService, useValue: tagsService },
                { provide: MapService, useValue: mapService },
                {
                    provide: OverlayNavigationService,
                    useValue: overlayNavigation,
                },
                { provide: MatDialog, useValue: dialog },
                { provide: MatSnackBar, useValue: snackBar },
                {
                    provide: ConfigService,
                    useValue: {
                        updateChangesetLastActivity: vi.fn(),
                        ...(configService as object),
                    },
                },
                { provide: TranslateService, useValue: translate },
                { provide: UPLOAD_SUCCESS_DELAY_MS, useValue: successDelayMs },
            ],
        })
        return TestBed.runInInjectionContext(() => new PushDataToOsmPage())
    }

    const creationErrors = [
        { status: 400, error: 'Invalid changeset request' },
        { status: 401, error: 'Authentication failed' },
        { status: 403, error: 'Upload forbidden' },
        { status: 429, error: 'Too many requests' },
        {
            status: 0,
            error: new ProgressEvent('error'),
            message: 'Network error',
        },
    ]

    const queuedFeature = (
        changeType: 'Create' | 'Update' | 'Delete',
        id: number,
        type: 'node' | 'way' | 'relation' = 'node',
        version = changeType === 'Create' ? 0 : 3,
        usedByWays?: boolean | string[]
    ) => ({
        type: 'Feature',
        id: `${type}/${id}`,
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: {
            id,
            type,
            changeType,
            tags: { amenity: 'bench' },
            meta: { version },
            usedByWays,
        },
    })

    const receiptFor = (feature: ReturnType<typeof queuedFeature>) => {
        const type = feature.properties.type
        const oldId = String(feature.properties.id)
        const receipt: Record<string, unknown> = {
            type,
            old_id: oldId,
            osmgoOldId: `${type}/${oldId}`,
        }
        if (feature.properties.changeType !== 'Delete') {
            const newId =
                feature.properties.changeType === 'Create' ? '101' : oldId
            receipt['new_id'] = newId
            receipt['new_version'] = feature.properties.meta.version + 1
            receipt['osmgoNewId'] = `${type}/${newId}`
        }
        return receipt
    }

    for (const creationError of creationErrors) {
        it(`recovers from a changeset creation error with status ${creationError.status}`, async () => {
            const queuedFeature = { id: 'node/-1' }
            const changedData = { features: [queuedFeature] }
            const dataService = {
                getGeojsonChanged: () => changedData,
                replaceIdGenerateByOldVersion: () => Promise.resolve(),
            }
            const osmApi = {
                getValidChangeset: vi
                    .fn()
                    .mockName('getValidChangeset')
                    .mockReturnValue(throwError(() => creationError)),
                apiOsmSendOsmDiffFile: vi
                    .fn()
                    .mockName('apiOsmSendOsmDiffFile'),
            }
            const mapService = createProcessingMapService()
            const processing = mapService.isProcessing
            const processingValues: boolean[] = []
            processing.subscribe((value) => processingValues.push(value))
            const configService = {
                getChangeSetComment: () => '',
                setChangeSetComment: vi.fn().mockName('setChangeSetComment'),
            }
            const page = createPage({
                dataService,
                osmApi,
                mapService,
                configService,
            })
            vi.spyOn(page, 'userIsConnected').mockResolvedValue(true)

            await page.pushDataToOsm('Survey')

            const expectedMessage =
                typeof creationError.error === 'string'
                    ? creationError.error
                    : creationError.message
            expect(page.isPushing()).toBe(false)
            expect(processing.value).toBe(false)
            expect(processingValues).toEqual([false, true, false])
            expect(page.error()).toEqual({
                status: creationError.status,
                message: expectedMessage,
                feature: null,
            })
            expect(changedData.features).toEqual([queuedFeature])
            expect(osmApi.apiOsmSendOsmDiffFile).not.toHaveBeenCalled()
        })
    }

    it('does not retry or remove queued data after a diff timeout', async () => {
        const queuedFeature = { id: 'node/-1' }
        const changedData = { features: [queuedFeature] }
        const dataService = {
            getGeojsonChanged: () => changedData,
            replaceIdGenerateByOldVersion: () => Promise.resolve(),
        }
        const osmApi = {
            getValidChangeset: () => of('123'),
            osmGoFeaturesToOsmDiffFile: () => '<osmChange/>',
            apiOsmSendOsmDiffFile: vi
                .fn()
                .mockName('apiOsmSendOsmDiffFile')
                .mockReturnValue(throwError(() => new TimeoutError())),
        }
        const mapService = createProcessingMapService()
        const processing = mapService.isProcessing
        const configService = {
            getChangeSetComment: () => '',
            setChangeSetComment: vi.fn().mockName('setChangeSetComment'),
        }
        const page = createPage({
            dataService,
            osmApi,
            mapService,
            configService,
        })
        vi.spyOn(page, 'userIsConnected').mockResolvedValue(true)

        await page.pushDataToOsm('Survey')

        expect(osmApi.apiOsmSendOsmDiffFile).toHaveBeenCalledTimes(1)
        expect(page.isPushing()).toBe(false)
        expect(processing.value).toBe(false)
        expect(page.error()?.message).toContain('Timeout')
        expect(page.featuresChanges()).toEqual([queuedFeature])
        expect(changedData.features).toEqual([queuedFeature])
    })

    it('ignores an unrecognized deleted-feature conflict message', () => {
        const page = createPage({
            dataService: { getGeojsonChanged: () => ({ features: [] }) },
            configService: { getChangeSetComment: () => '' },
        })

        expect(page.getFeatureFromErrorResult(410, 'Unexpected conflict')).toBe(
            null
        )
    })

    it('centers and zooms a point before closing the upload screen', () => {
        const map = {
            getZoom: vi.fn(() => 16),
            setZoom: vi.fn(),
            setCenter: vi.fn(),
            fitBounds: vi.fn(),
        }
        const close = vi.fn().mockResolvedValue(true)
        const page = createPage({
            dataService: { getGeojsonChanged: () => ({ features: [] }) },
            configService: { getChangeSetComment: () => '' },
            mapService: { map },
            overlayNavigation: { close },
        })

        page.centerToElement({ type: 'Point', coordinates: [2.3, 48.8] })

        expect(map.setZoom).toHaveBeenCalledWith(18.5)
        expect(map.setCenter).toHaveBeenCalledWith([2.3, 48.8])
        expect(map.fitBounds).not.toHaveBeenCalled()
        expect(close).toHaveBeenCalledOnce()
    })

    it.each([
        [
            'LineString',
            {
                type: 'LineString',
                coordinates: [
                    [2.1, 48.7],
                    [2.4, 48.9],
                    [2.2, 48.6],
                ],
            },
            [
                [2.1, 48.6],
                [2.4, 48.9],
            ],
        ],
        [
            'MultiPolygon',
            {
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [1, 4],
                            [3, 2],
                            [1, 4],
                        ],
                    ],
                    [
                        [
                            [-1, 5],
                            [2, 1],
                            [-1, 5],
                        ],
                    ],
                ],
            },
            [
                [-1, 1],
                [3, 5],
            ],
        ],
    ])(
        'fits the complete %s geometry before closing',
        (_, geometry, bounds) => {
            const map = {
                getZoom: vi.fn(),
                setZoom: vi.fn(),
                setCenter: vi.fn(),
                fitBounds: vi.fn(),
            }
            const close = vi.fn().mockResolvedValue(true)
            const page = createPage({
                dataService: { getGeojsonChanged: () => ({ features: [] }) },
                configService: { getChangeSetComment: () => '' },
                mapService: { map },
                overlayNavigation: { close },
            })

            page.centerToElement(geometry as any)

            expect(map.fitBounds).toHaveBeenCalledWith(bounds, {
                maxZoom: 18.5,
                padding: 48,
            })
            expect(map.setCenter).not.toHaveBeenCalled()
            expect(close).toHaveBeenCalledOnce()
        }
    )

    it('returns to the screen after user verification times out', async () => {
        const queuedFeature = { id: 'node/-1' }
        const changedData = { features: [queuedFeature] }
        const dataService = {
            getGeojsonChanged: () => changedData,
            replaceIdGenerateByOldVersion: () => Promise.resolve(),
        }
        const osmApi = {
            getUserDetail$: () => throwError(() => new TimeoutError()),
            getValidChangeset: vi.fn().mockName('getValidChangeset'),
        }
        const mapService = createProcessingMapService()
        const processing = mapService.isProcessing
        const configService = {
            getChangeSetComment: () => '',
            setChangeSetComment: vi.fn().mockName('setChangeSetComment'),
        }
        const page = createPage({
            dataService,
            osmApi,
            mapService,
            configService,
        })
        vi.spyOn(console, 'error').mockReturnValue(undefined)

        await page.pushDataToOsm('Survey')

        expect(page.isPushing()).toBe(false)
        expect(processing.value).toBe(false)
        expect(page.connectionError()).toContain('Timeout')
        expect(osmApi.getValidChangeset).not.toHaveBeenCalled()
        expect(changedData.features).toEqual([queuedFeature])
    })

    it('invalidates a closed changeset without retrying the diff', async () => {
        const queuedFeature = { id: 'node/-1' }
        const changedData = { features: [queuedFeature] }
        const dataService = {
            getGeojsonChanged: () => changedData,
            replaceIdGenerateByOldVersion: () => Promise.resolve(),
        }
        const closedChangesetError = {
            status: 409,
            error: 'The changeset 123 was closed at 2026-08-01T13:00:00Z.',
        }
        const osmApi = {
            getValidChangeset: () => of('123'),
            osmGoFeaturesToOsmDiffFile: () => '<osmChange/>',
            apiOsmSendOsmDiffFile: vi
                .fn()
                .mockName('apiOsmSendOsmDiffFile')
                .mockReturnValue(throwError(() => closedChangesetError)),
        }
        const mapService = createProcessingMapService()
        const processing = mapService.isProcessing
        const configService = {
            getChangeSetComment: () => '',
            setChangeSetComment: vi.fn().mockName('setChangeSetComment'),
            invalidateChangeset: vi.fn().mockName('invalidateChangeset'),
        }
        const page = createPage({
            dataService,
            osmApi,
            mapService,
            configService,
        })
        vi.spyOn(page, 'userIsConnected').mockResolvedValue(true)

        await page.pushDataToOsm('Survey')

        expect(osmApi.apiOsmSendOsmDiffFile).toHaveBeenCalledTimes(1)
        expect(configService.invalidateChangeset).toHaveBeenCalledTimes(1)
        expect(page.isPushing()).toBe(false)
        expect(processing.value).toBe(false)
        expect(page.error()?.message).toContain('Please retry')
        expect(page.featuresChanges()).toEqual([queuedFeature])
        expect(changedData.features).toEqual([queuedFeature])

        closedChangesetError.error =
            'Version mismatch: Provided 3, server had: 4 of Node 12'
        await page.pushDataToOsm('Survey')

        expect(osmApi.apiOsmSendOsmDiffFile).toHaveBeenCalledTimes(2)
        expect(configService.invalidateChangeset).toHaveBeenCalledTimes(1)
    })

    it('starts only one upload when the button is clicked twice', async () => {
        let continuePreparation: () => void = () => {
            throw new Error('Upload preparation did not start.')
        }
        const preparation = new Promise<void>(
            (resolve) => (continuePreparation = resolve)
        )
        const uploadResult = new Subject<never>()
        const changedData = { features: [{ id: 'node/-1' }] }
        const dataService = {
            getGeojsonChanged: () => changedData,
            replaceIdGenerateByOldVersion: vi
                .fn()
                .mockName('replaceIdGenerateByOldVersion')
                .mockReturnValue(preparation),
        }
        const osmApi = {
            getValidChangeset: () => of('123'),
            osmGoFeaturesToOsmDiffFile: () => '<osmChange/>',
            apiOsmSendOsmDiffFile: vi
                .fn()
                .mockName('apiOsmSendOsmDiffFile')
                .mockReturnValue(uploadResult),
        }
        const mapService = createProcessingMapService()
        const configService = {
            getChangeSetComment: () => '',
            setChangeSetComment: vi.fn().mockName('setChangeSetComment'),
        }
        const page = createPage({
            dataService,
            osmApi,
            mapService,
            configService,
        })
        vi.spyOn(page, 'userIsConnected').mockResolvedValue(true)
        vi.spyOn(console, 'log').mockReturnValue(undefined)

        const firstUpload = page.pushDataToOsm('Survey')
        const secondUpload = page.pushDataToOsm('Survey')
        continuePreparation()
        await vi.waitFor(() =>
            expect(osmApi.apiOsmSendOsmDiffFile).toHaveBeenCalledTimes(1)
        )
        uploadResult.error(new Error('Fixture upload stopped'))
        await Promise.all([firstUpload, secondUpload])

        expect(dataService.replaceIdGenerateByOldVersion).toHaveBeenCalledTimes(
            1
        )
        expect(osmApi.apiOsmSendOsmDiffFile).toHaveBeenCalledTimes(1)
        expect(page.uploadInFlight()).toBe(false)
    })

    it('prepares one hundred returned IDs and versions before applying them', async () => {
        const features = Array.from({ length: 100 }, (_value, i) => ({
            type: 'Feature',
            id: `node/-${i + 1}`,
            geometry: { type: 'Point', coordinates: [i, i] },
            properties: {
                id: -(i + 1),
                type: 'node',
                changeType: 'Create',
                tags: i === 0 ? {} : { amenity: 'bench' },
                meta: { version: 0 },
            },
        }))
        const applyUploadResults = vi
            .fn()
            .mockName('applyUploadResults')
            .mockResolvedValue(undefined)
        const dataService = {
            getGeojsonChanged: () => ({ features }),
            applyUploadResults,
        }
        const mapService = { getIconStyle: (feature: unknown) => feature }
        const configService = {
            getChangeSetComment: () => '',
            getUserInfo: () => ({ uid: 7, display_name: 'Mapper' }),
        }
        const page = createPage({ dataService, mapService, configService })
        page.changesetId = '456'
        const diffResults = features.map((feature, i) => ({
            type: 'node',
            old_id: String(feature.properties.id),
            osmgoOldId: feature.id,
            osmgoNewId: `node/${i + 1}`,
            new_id: String(i + 1),
            new_version: 1,
        }))

        await (page as any).updateLocalDataFromDiffResult(diffResults, features)

        const preparedResults = vi.mocked(applyUploadResults).mock.lastCall?.[0]
        expect(preparedResults).toBeDefined()
        if (!preparedResults)
            throw new Error('Upload results were not applied.')
        expect(preparedResults.length).toBe(100)
        expect(preparedResults[0].oldId).toBe('node/-1')
        expect(preparedResults[0].feature.id).toBe('node/1')
        expect(preparedResults[0].feature.properties.id).toBe(1)
        expect(preparedResults[0].feature.properties.meta.version).toBe(1)
        expect(preparedResults[0].feature.properties.meta.changeset).toBe('456')
        expect(preparedResults[0].feature.properties.changeType).toBeUndefined()
    })

    it('does not apply any result when the response is inconsistent', async () => {
        const feature = {
            id: 'node/-1',
            properties: {
                id: -1,
                type: 'node',
                changeType: 'Create',
                tags: {},
                meta: { version: 0 },
            },
        }
        const applyUploadResults = vi.fn().mockName('applyUploadResults')
        const dataService = {
            getGeojsonChanged: () => ({ features: [feature] }),
            applyUploadResults,
        }
        const configService = { getChangeSetComment: () => '' }
        const page = createPage({ dataService, configService })

        await expect(
            (page as any).updateLocalDataFromDiffResult(
                [
                    {
                        type: 'node',
                        old_id: '-1',
                        osmgoOldId: 'node/-1',
                    },
                    {
                        type: 'node',
                        old_id: '-999',
                        osmgoOldId: 'node/-999',
                    },
                ],
                [feature]
            )
        ).rejects.toThrow()

        expect(applyUploadResults).not.toHaveBeenCalled()
    })

    it.each([
        [
            'truncated',
            () => {
                const first = queuedFeature('Create', -1)
                const second = queuedFeature('Create', -2)
                return {
                    features: [first, second],
                    results: [receiptFor(first)],
                }
            },
        ],
        [
            'additional',
            () => {
                const feature = queuedFeature('Create', -1)
                return {
                    features: [feature],
                    results: [
                        receiptFor(feature),
                        receiptFor(queuedFeature('Create', -2)),
                    ],
                }
            },
        ],
        [
            'duplicated',
            () => {
                const first = queuedFeature('Create', -1)
                const second = queuedFeature('Create', -2)
                return {
                    features: [first, second],
                    results: [receiptFor(first), receiptFor(first)],
                }
            },
        ],
        [
            'wrong element type',
            () => {
                const feature = queuedFeature('Create', -1)
                return {
                    features: [feature],
                    results: [
                        {
                            ...receiptFor(feature),
                            type: 'way',
                            osmgoOldId: 'way/-1',
                            osmgoNewId: 'way/101',
                        },
                    ],
                }
            },
        ],
        [
            'invalid creation version',
            () => {
                const feature = queuedFeature('Create', -1)
                return {
                    features: [feature],
                    results: [{ ...receiptFor(feature), new_version: 2 }],
                }
            },
        ],
        [
            'incompatible deletion receipt',
            () => {
                const feature = queuedFeature('Delete', 12)
                return {
                    features: [feature],
                    results: [
                        {
                            ...receiptFor(feature),
                            new_id: '12',
                            new_version: 4,
                            osmgoNewId: 'node/12',
                        },
                    ],
                }
            },
        ],
    ])('keeps the queue intact for a %s diff result', async (_, arrange) => {
        const { features, results } = arrange()
        const applyUploadResults = vi.fn().mockName('applyUploadResults')
        const page = createPage({
            dataService: {
                getGeojsonChanged: () => ({ features }),
                applyUploadResults,
            },
            configService: { getChangeSetComment: () => '' },
        })

        await expect(
            (page as any).updateLocalDataFromDiffResult(results, features)
        ).rejects.toThrow()

        expect(applyUploadResults).not.toHaveBeenCalled()
    })

    it('accepts a deletion receipt without a new ID or version', async () => {
        const feature = queuedFeature('Delete', 12)
        const applyUploadResults = vi.fn().mockResolvedValue(undefined)
        const page = createPage({
            dataService: {
                getGeojsonChanged: () => ({ features: [feature] }),
                applyUploadResults,
            },
            configService: { getChangeSetComment: () => '' },
        })

        await (page as any).updateLocalDataFromDiffResult(
            [receiptFor(feature)],
            [feature]
        )

        expect(applyUploadResults).toHaveBeenCalledWith([{ oldId: 'node/12' }])
    })

    it('accepts an acknowledged tag removal sent as a modification', async () => {
        const feature = queuedFeature('Delete', 12, 'node', 3, true)
        const applyUploadResults = vi.fn().mockResolvedValue(undefined)
        const page = createPage({
            dataService: {
                getGeojsonChanged: () => ({ features: [feature] }),
                applyUploadResults,
            },
            configService: { getChangeSetComment: () => '' },
        })

        await (page as any).updateLocalDataFromDiffResult(
            [
                {
                    type: 'node',
                    old_id: '12',
                    osmgoOldId: 'node/12',
                    new_id: '12',
                    osmgoNewId: 'node/12',
                    new_version: 4,
                },
            ],
            [feature]
        )

        expect(applyUploadResults).toHaveBeenCalledWith([{ oldId: 'node/12' }])
    })

    it('finishes an acknowledged upload after the page is backgrounded', async () => {
        const feature = {
            id: 'node/-1',
            properties: {
                id: -1,
                type: 'node',
                changeType: 'Create',
                tags: { amenity: 'bench' },
                meta: { version: 0 },
            },
            geometry: { type: 'Point', coordinates: [1, 2] },
        }
        const changedData = { features: [feature] }
        const uploadResult = new Subject<any[]>()
        const applyUploadResults = vi
            .fn()
            .mockName('applyUploadResults')
            .mockResolvedValue(undefined)
        const dataService = {
            getGeojsonChanged: () => changedData,
            getGeojson: () => ({ features: [] }),
            replaceIdGenerateByOldVersion: () => Promise.resolve(),
            applyUploadResults,
        }
        const apiOsmSendOsmDiffFile = vi
            .fn()
            .mockName('apiOsmSendOsmDiffFile')
            .mockReturnValue(uploadResult)
        const osmApi = {
            getValidChangeset: () => of('123'),
            osmGoFeaturesToOsmDiffFile: () => '<osmChange/>',
            apiOsmSendOsmDiffFile,
        }
        const mapService = {
            ...createProcessingMapService(),
            getIconStyle: (value: unknown) => value,
            redrawMarkers: vi.fn().mockName('redrawMarkers'),
            redrawChangedMarkers: vi.fn().mockName('redrawChangedMarkers'),
        }
        const configService = {
            getChangeSetComment: () => '',
            setChangeSetComment: () => {},
            getUserInfo: () => ({ uid: 7, display_name: 'Mapper' }),
            updateChangesetLastActivity: vi.fn(),
        }
        const closeOverlay = vi.fn().mockName('close').mockResolvedValue(true)
        const page = createPage({
            dataService,
            osmApi,
            mapService,
            overlayNavigation: { close: closeOverlay },
            configService,
        })
        vi.spyOn(page, 'userIsConnected').mockResolvedValue(true)
        const upload = page.pushDataToOsm('Survey')
        await vi.waitFor(() =>
            expect(apiOsmSendOsmDiffFile).toHaveBeenCalledTimes(1)
        )
        page.ngOnDestroy()

        uploadResult.next([
            {
                type: 'node',
                old_id: '-1',
                osmgoOldId: 'node/-1',
                osmgoNewId: 'node/101',
                new_id: '101',
                new_version: 1,
            },
        ])
        await upload

        expect(applyUploadResults).toHaveBeenCalledTimes(1)
        expect(page.uploadedOk()).toBe(true)
        expect(page.uploadInFlight()).toBe(false)
        expect(mapService.isProcessing.value).toBe(false)
        expect(closeOverlay).not.toHaveBeenCalled()
    })

    it('unlocks before closing a successful upload exactly once', async () => {
        const feature = {
            id: 'node/-1',
            properties: {
                id: -1,
                type: 'node',
                changeType: 'Create',
                tags: { amenity: 'bench' },
                meta: { version: 0 },
            },
            geometry: { type: 'Point', coordinates: [1, 2] },
        }
        const changedData = { features: [feature] }
        const dataService = {
            getGeojsonChanged: () => changedData,
            getGeojson: () => ({ features: [] }),
            replaceIdGenerateByOldVersion: () => Promise.resolve(),
            applyUploadResults: vi.fn().mockImplementation(async () => {
                changedData.features = []
            }),
        }
        const osmApi = {
            getValidChangeset: () => of('123'),
            osmGoFeaturesToOsmDiffFile: () => '<osmChange/>',
            apiOsmSendOsmDiffFile: () =>
                of([
                    {
                        type: 'node',
                        old_id: '-1',
                        osmgoOldId: 'node/-1',
                        osmgoNewId: 'node/101',
                        new_id: '101',
                        new_version: 1,
                    },
                ]),
        }
        const mapService = {
            ...createProcessingMapService(),
            getIconStyle: (value: unknown) => value,
            redrawMarkers: vi.fn().mockName('redrawMarkers'),
            redrawChangedMarkers: vi.fn().mockName('redrawChangedMarkers'),
        }
        const configService = {
            getChangeSetComment: () => '',
            setChangeSetComment: () => {},
            getUserInfo: () => ({ uid: 7, display_name: 'Mapper' }),
            updateChangesetLastActivity: vi.fn(),
        }
        let page: PushDataToOsmPage
        const closeOverlay = vi.fn().mockImplementation(async () => {
            expect(page.uploadInFlight()).toBe(false)
            expect(mapService.isProcessing.value).toBe(false)
            return true
        })
        page = createPage({
            dataService,
            osmApi,
            mapService,
            overlayNavigation: { close: closeOverlay },
            configService,
        })
        vi.spyOn(page, 'userIsConnected').mockResolvedValue(true)

        await page.pushDataToOsm('Survey')
        page.back()

        expect(page.uploadedOk()).toBe(true)
        expect(page.uploadStatusVisible()).toBe(false)
        expect(configService.updateChangesetLastActivity).toHaveBeenCalledTimes(
            1
        )
        expect(closeOverlay).toHaveBeenCalledTimes(1)
    })

    it('unlocks and keeps queued data when persistence fails', async () => {
        const feature = {
            id: 'node/-1',
            properties: {
                id: -1,
                type: 'node',
                changeType: 'Create',
                tags: { amenity: 'bench' },
                meta: { version: 0 },
            },
            geometry: { type: 'Point', coordinates: [1, 2] },
        }
        const changedData = { features: [feature] }
        const dataService = {
            getGeojsonChanged: () => changedData,
            replaceIdGenerateByOldVersion: () => Promise.resolve(),
            applyUploadResults: vi
                .fn()
                .mockRejectedValue(new Error('Storage unavailable')),
        }
        const osmApi = {
            getValidChangeset: () => of('123'),
            osmGoFeaturesToOsmDiffFile: () => '<osmChange/>',
            apiOsmSendOsmDiffFile: () =>
                of([
                    {
                        type: 'node',
                        old_id: '-1',
                        osmgoOldId: 'node/-1',
                        osmgoNewId: 'node/101',
                        new_id: '101',
                        new_version: 1,
                    },
                ]),
        }
        const mapService = {
            ...createProcessingMapService(),
            getIconStyle: (value: unknown) => value,
        }
        const configService = {
            getChangeSetComment: () => '',
            setChangeSetComment: () => {},
            getUserInfo: () => ({ uid: 7, display_name: 'Mapper' }),
            updateChangesetLastActivity: vi.fn(),
        }
        const closeOverlay = vi.fn().mockName('close')
        const page = createPage({
            dataService,
            osmApi,
            mapService,
            overlayNavigation: { close: closeOverlay },
            configService,
        })
        vi.spyOn(page, 'userIsConnected').mockResolvedValue(true)

        await page.pushDataToOsm('Survey')

        expect(page.uploadInFlight()).toBe(false)
        expect(mapService.isProcessing.value).toBe(false)
        expect(page.error()?.message).toBe('Storage unavailable')
        expect(configService.updateChangesetLastActivity).toHaveBeenCalledTimes(
            1
        )
        expect(changedData.features).toEqual([feature])
        expect(closeOverlay).not.toHaveBeenCalled()
    })
})
