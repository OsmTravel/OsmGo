import { BehaviorSubject, throwError } from 'rxjs'

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
})
