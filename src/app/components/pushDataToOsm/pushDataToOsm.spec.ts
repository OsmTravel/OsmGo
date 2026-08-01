import { BehaviorSubject, of, throwError, TimeoutError } from 'rxjs'

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
})
