import {
    BehaviorSubject,
    NEVER,
    of,
    Subject,
    throwError,
    TimeoutError,
} from 'rxjs'

import { PushDataToOsmPage } from './pushDataToOsm'

describe('PushDataToOsmPage', () => {
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

    for (const creationError of creationErrors) {
        it(`recovers from a changeset creation error with status ${creationError.status}`, async () => {
            const queuedFeature = { id: 'node/-1' }
            const changedData = { features: [queuedFeature] }
            const dataService = {
                getGeojsonChanged: () => changedData,
                replaceIdGenerateByOldVersion: () => Promise.resolve(),
            }
            const osmApi = {
                getValidChangset: jasmine
                    .createSpy('getValidChangset')
                    .and.returnValue(throwError(() => creationError)),
                apiOsmSendOsmDiffFile: jasmine.createSpy(
                    'apiOsmSendOsmDiffFile'
                ),
            }
            const processing = new BehaviorSubject(false)
            const processingValues = []
            processing.subscribe((value) => processingValues.push(value))
            const mapService = { isProcessing: processing }
            const configService = {
                getChangeSetComment: () => '',
                setChangeSetComment: jasmine.createSpy('setChangeSetComment'),
            }
            const page = new PushDataToOsmPage(
                dataService as any,
                osmApi as any,
                {} as any,
                mapService as any,
                {} as any,
                {} as any,
                configService as any,
                {} as any,
                {} as any,
                {} as any
            )
            spyOn(page, 'userIsConnected').and.resolveTo(true)

            await page.pushDataToOsm('Survey')

            const expectedMessage =
                typeof creationError.error === 'string'
                    ? creationError.error
                    : creationError.message
            expect(page.isPushing).toBeFalse()
            expect(processing.value).toBeFalse()
            expect(processingValues).toEqual([false, true, false])
            expect(page.error).toEqual({
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
            getValidChangset: () => of('123'),
            osmGoFeaturesToOsmDiffFile: () => '<osmChange/>',
            apiOsmSendOsmDiffFile: jasmine
                .createSpy('apiOsmSendOsmDiffFile')
                .and.returnValue(throwError(() => new TimeoutError())),
        }
        const processing = new BehaviorSubject(false)
        const mapService = { isProcessing: processing }
        const configService = {
            getChangeSetComment: () => '',
            setChangeSetComment: jasmine.createSpy('setChangeSetComment'),
        }
        const page = new PushDataToOsmPage(
            dataService as any,
            osmApi as any,
            {} as any,
            mapService as any,
            {} as any,
            {} as any,
            configService as any,
            {} as any,
            {} as any,
            {} as any
        )
        spyOn(page, 'userIsConnected').and.resolveTo(true)

        await page.pushDataToOsm('Survey')

        expect(osmApi.apiOsmSendOsmDiffFile).toHaveBeenCalledTimes(1)
        expect(page.isPushing).toBeFalse()
        expect(processing.value).toBeFalse()
        expect(page.error.message).toContain('Timeout')
        expect(page.featuresChanges).toEqual([queuedFeature])
        expect(changedData.features).toEqual([queuedFeature])
    })

    it('returns to the screen after user verification times out', async () => {
        const queuedFeature = { id: 'node/-1' }
        const changedData = { features: [queuedFeature] }
        const dataService = {
            getGeojsonChanged: () => changedData,
            replaceIdGenerateByOldVersion: () => Promise.resolve(),
        }
        const osmApi = {
            getUserDetail$: () => throwError(() => new TimeoutError()),
            getValidChangset: jasmine.createSpy('getValidChangset'),
        }
        const processing = new BehaviorSubject(false)
        const mapService = { isProcessing: processing }
        const configService = {
            getChangeSetComment: () => '',
            setChangeSetComment: jasmine.createSpy('setChangeSetComment'),
        }
        const page = new PushDataToOsmPage(
            dataService as any,
            osmApi as any,
            {} as any,
            mapService as any,
            {} as any,
            {} as any,
            configService as any,
            {} as any,
            {} as any,
            {} as any
        )
        spyOn(console, 'error')

        await page.pushDataToOsm('Survey')

        expect(page.isPushing).toBeFalse()
        expect(processing.value).toBeFalse()
        expect(page.connectionError).toContain('Timeout')
        expect(osmApi.getValidChangset).not.toHaveBeenCalled()
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
            getValidChangset: () => of('123'),
            osmGoFeaturesToOsmDiffFile: () => '<osmChange/>',
            apiOsmSendOsmDiffFile: jasmine
                .createSpy('apiOsmSendOsmDiffFile')
                .and.returnValue(throwError(() => closedChangesetError)),
        }
        const processing = new BehaviorSubject(false)
        const mapService = { isProcessing: processing }
        const configService = {
            getChangeSetComment: () => '',
            setChangeSetComment: jasmine.createSpy('setChangeSetComment'),
            invalidateChangeset: jasmine.createSpy('invalidateChangeset'),
        }
        const page = new PushDataToOsmPage(
            dataService as any,
            osmApi as any,
            {} as any,
            mapService as any,
            {} as any,
            {} as any,
            configService as any,
            {} as any,
            {} as any,
            {} as any
        )
        spyOn(page, 'userIsConnected').and.resolveTo(true)

        await page.pushDataToOsm('Survey')

        expect(osmApi.apiOsmSendOsmDiffFile).toHaveBeenCalledTimes(1)
        expect(configService.invalidateChangeset).toHaveBeenCalledTimes(1)
        expect(page.isPushing).toBeFalse()
        expect(processing.value).toBeFalse()
        expect(page.error.message).toContain('Please retry')
        expect(page.featuresChanges).toEqual([queuedFeature])
        expect(changedData.features).toEqual([queuedFeature])

        closedChangesetError.error =
            'Version mismatch: Provided 3, server had: 4 of Node 12'
        await page.pushDataToOsm('Survey')

        expect(osmApi.apiOsmSendOsmDiffFile).toHaveBeenCalledTimes(2)
        expect(configService.invalidateChangeset).toHaveBeenCalledTimes(1)
    })

    it('starts only one upload when the button is clicked twice', async () => {
        let continuePreparation
        const preparation = new Promise<void>(
            (resolve) => (continuePreparation = resolve)
        )
        const changedData = { features: [{ id: 'node/-1' }] }
        const dataService = {
            getGeojsonChanged: () => changedData,
            replaceIdGenerateByOldVersion: jasmine
                .createSpy('replaceIdGenerateByOldVersion')
                .and.returnValue(preparation),
        }
        const osmApi = {
            getValidChangset: () => of('123'),
            osmGoFeaturesToOsmDiffFile: () => '<osmChange/>',
            apiOsmSendOsmDiffFile: jasmine
                .createSpy('apiOsmSendOsmDiffFile')
                .and.returnValue(NEVER),
        }
        const mapService = { isProcessing: new BehaviorSubject(false) }
        const configService = {
            getChangeSetComment: () => '',
            setChangeSetComment: jasmine.createSpy('setChangeSetComment'),
        }
        const page = new PushDataToOsmPage(
            dataService as any,
            osmApi as any,
            {} as any,
            mapService as any,
            {} as any,
            {} as any,
            configService as any,
            {} as any,
            {} as any,
            {} as any
        )
        spyOn(page, 'userIsConnected').and.resolveTo(true)
        spyOn(console, 'log')

        const firstUpload = page.pushDataToOsm('Survey')
        const secondUpload = page.pushDataToOsm('Survey')
        continuePreparation()
        await Promise.all([firstUpload, secondUpload])

        expect(dataService.replaceIdGenerateByOldVersion).toHaveBeenCalledTimes(
            1
        )
        expect(osmApi.apiOsmSendOsmDiffFile).toHaveBeenCalledTimes(1)
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
        const applyUploadResults = jasmine
            .createSpy('applyUploadResults')
            .and.resolveTo()
        const dataService = {
            getGeojsonChanged: () => ({ features }),
            applyUploadResults,
        }
        const mapService = { getIconStyle: (feature) => feature }
        const configService = {
            getChangeSetComment: () => '',
            getUserInfo: () => ({ uid: 7, display_name: 'Mapper' }),
        }
        const page = new PushDataToOsmPage(
            dataService as any,
            {} as any,
            {} as any,
            mapService as any,
            {} as any,
            {} as any,
            configService as any,
            {} as any,
            {} as any,
            {} as any
        )
        const diffResults = features.map((feature, i) => ({
            typeChange: 'Create',
            osmgoOldId: feature.id,
            osmgoNewId: `node/${i + 1}`,
            new_id: i + 1,
            new_version: 1,
        }))

        await (page as any).updateLocalDataFromDiffResult(diffResults, features)

        const preparedResults = applyUploadResults.calls.mostRecent().args[0]
        expect(preparedResults.length).toBe(100)
        expect(preparedResults[0].oldId).toBe('node/-1')
        expect(preparedResults[0].feature.id).toBe('node/1')
        expect(preparedResults[0].feature.properties.id).toBe(1)
        expect(preparedResults[0].feature.properties.meta.version).toBe(1)
        expect(preparedResults[0].feature.properties.changeType).toBeUndefined()
    })

    it('does not apply any result when the response is inconsistent', async () => {
        const feature = {
            id: 'node/-1',
            properties: { tags: {}, meta: {} },
        }
        const applyUploadResults = jasmine.createSpy('applyUploadResults')
        const dataService = {
            getGeojsonChanged: () => ({ features: [feature] }),
            applyUploadResults,
        }
        const configService = { getChangeSetComment: () => '' }
        const page = new PushDataToOsmPage(
            dataService as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            configService as any,
            {} as any,
            {} as any,
            {} as any
        )

        await expectAsync(
            (page as any).updateLocalDataFromDiffResult(
                [
                    {
                        typeChange: 'Delete',
                        osmgoOldId: 'node/-1',
                    },
                    {
                        typeChange: 'Delete',
                        osmgoOldId: 'node/-999',
                    },
                ],
                [feature]
            )
        ).toBeRejected()

        expect(applyUploadResults).not.toHaveBeenCalled()
    })

    it('finishes an acknowledged upload after the page is backgrounded', async () => {
        const feature = {
            id: 'node/-1',
            properties: {
                id: -1,
                changeType: 'Create',
                tags: { amenity: 'bench' },
                meta: { version: 0 },
            },
            geometry: { type: 'Point', coordinates: [1, 2] },
        }
        const changedData = { features: [feature] }
        const uploadResult = new Subject<any[]>()
        const applyUploadResults = jasmine
            .createSpy('applyUploadResults')
            .and.resolveTo()
        const dataService = {
            getGeojsonChanged: () => changedData,
            getGeojson: () => ({ features: [] }),
            replaceIdGenerateByOldVersion: () => Promise.resolve(),
            applyUploadResults,
        }
        const osmApi = {
            getValidChangset: () => of('123'),
            osmGoFeaturesToOsmDiffFile: () => '<osmChange/>',
            apiOsmSendOsmDiffFile: () => uploadResult,
        }
        const mapService = {
            isProcessing: new BehaviorSubject(false),
            getIconStyle: (value) => value,
            eventMarkerReDraw: jasmine.createSpyObj('EventEmitter', ['emit']),
            eventMarkerChangedReDraw: jasmine.createSpyObj('EventEmitter', [
                'emit',
            ]),
        }
        const configService = {
            getChangeSetComment: () => '',
            setChangeSetComment: () => {},
            getUserInfo: () => ({ uid: 7, display_name: 'Mapper' }),
        }
        const page = new PushDataToOsmPage(
            dataService as any,
            osmApi as any,
            {} as any,
            mapService as any,
            { back: jasmine.createSpy('back') } as any,
            {} as any,
            configService as any,
            {} as any,
            {} as any,
            {} as any
        )
        spyOn(page, 'userIsConnected').and.resolveTo(true)
        await page.pushDataToOsm('Survey')
        page.ngOnDestroy()

        uploadResult.next([
            {
                typeChange: 'Create',
                osmgoOldId: 'node/-1',
                osmgoNewId: 'node/101',
                new_id: 101,
                new_version: 1,
            },
        ])
        await new Promise((resolve) => setTimeout(resolve))

        expect(applyUploadResults).toHaveBeenCalledTimes(1)
        expect(page.uploadedOk).toBeTrue()
    })
})
