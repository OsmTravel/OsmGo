import type { UploadReceiptEntry } from '@services/data.service'
import type { PersistedUploadJournal } from '@services/osm-state'
import {
    hashUploadPayload,
    UploadCoordinator,
    type UploadCoordinatorDependencies,
    type UploadFeature,
    type UploadState,
} from '@services/upload-coordinator.service'
import { type Observable, of, Subject, TimeoutError, throwError } from 'rxjs'

const queuedFeature = (
    changeType: 'Create' | 'Update' | 'Delete',
    id: number,
    type: 'node' | 'way' | 'relation' = 'node',
    version = changeType === 'Create' ? 0 : 3
): UploadFeature => ({
    type: 'Feature',
    id: `${type}/${id}`,
    geometry: { type: 'Point', coordinates: [1, 2] },
    properties: {
        id,
        type,
        changeType,
        tags: { amenity: 'bench' },
        meta: {
            version,
            changeset: '',
            timestamp: '',
            uid: '',
            user: '',
        },
        hexColor: '#000000',
        icon: 'bench',
        marker: 'bench',
        primaryTag: { key: 'amenity', value: 'bench' },
    },
})

const receiptFor = (feature: UploadFeature): Record<string, unknown> => {
    const type = feature.properties.type
    const oldId = String(feature.properties.id)
    const receipt: Record<string, unknown> = {
        type,
        old_id: oldId,
        osmgoOldId: `${type}/${oldId}`,
    }
    if (feature.properties.changeType !== 'Delete') {
        const newId = feature.properties.changeType === 'Create' ? '101' : oldId
        receipt['new_id'] = newId
        receipt['new_version'] = feature.properties.meta.version + 1
        receipt['osmgoNewId'] = `${type}/${newId}`
    }
    return receipt
}

const journalBase = (feature: UploadFeature) => ({
    journalVersion: 1 as const,
    attemptId: 'attempt-1',
    payloadHash: 'payload-hash',
    changesetId: '123',
    submittedIds: [String(feature.id)],
    summary: { Total: 1, Create: 1, Update: 0, Delete: 0 },
    startedAt: '2026-08-02T09:59:00.000Z',
})

const acknowledgedJournal = (
    feature: UploadFeature
): PersistedUploadJournal => ({
    ...journalBase(feature),
    phase: 'acknowledged',
    rawReceipt: [receiptFor(feature)],
    acknowledgedAt: '2026-08-02T10:00:00.000Z',
})

interface HarnessOptions {
    features?: UploadFeature[]
    connection$?: Observable<unknown>
    changeset$?: Observable<string>
    upload$?: Observable<unknown>
    journal?: PersistedUploadJournal
    beginUploadAttempt?: UploadCoordinatorDependencies['beginUploadAttempt']
    acknowledgeUploadAttempt?: UploadCoordinatorDependencies['acknowledgeUploadAttempt']
    applyReceipt?: (receipt: UploadReceiptEntry[]) => Promise<void>
    clearAppliedUploadAttempt?: UploadCoordinatorDependencies['clearAppliedUploadAttempt']
    discardPreparedUploadAttempt?: UploadCoordinatorDependencies['discardPreparedUploadAttempt']
}

const createHarness = (options: HarnessOptions = {}) => {
    const features = options.features ?? [queuedFeature('Create', -1)]
    const transitions: UploadState[] = []
    const processing: boolean[] = []
    const applyReceipt = vi.fn(
        options.applyReceipt ?? (async () => Promise.resolve())
    )
    const beginUploadAttempt = vi.fn(
        options.beginUploadAttempt ?? (async () => Promise.resolve())
    )
    const acknowledgeUploadAttempt = vi.fn(
        options.acknowledgeUploadAttempt ?? (async () => Promise.resolve())
    )
    const clearAppliedUploadAttempt = vi.fn(
        options.clearAppliedUploadAttempt ?? (async () => Promise.resolve())
    )
    const discardPreparedUploadAttempt = vi.fn(
        options.discardPreparedUploadAttempt ?? (async () => Promise.resolve())
    )
    const uploadDiff = vi.fn(() =>
        options.upload$ ? options.upload$ : of(features.map(receiptFor))
    )
    const dependencies = {
        getPendingFeatures: vi.fn(() => features),
        getUserDetail$: vi.fn(() => options.connection$ ?? of({})),
        getValidChangeset: vi.fn(() => options.changeset$ ?? of('123')),
        serializeDiff: vi.fn(() => '<osmChange/>'),
        uploadDiff,
        getUploadJournal: vi.fn(() => options.journal),
        beginUploadAttempt,
        acknowledgeUploadAttempt,
        applyAcknowledgedReceipt: vi.fn(async (_attemptId, receipt) =>
            applyReceipt(receipt)
        ),
        clearAppliedUploadAttempt,
        discardPreparedUploadAttempt,
        getUserInfo: vi.fn(() => ({
            uid: '7',
            display_name: 'Mapper',
            connected: true,
        })),
        setChangesetComment: vi.fn(),
        updateChangesetLastActivity: vi.fn(),
        invalidateChangeset: vi.fn(),
        styleFeature: vi.fn((feature: UploadFeature) => feature),
        setProcessing: vi.fn((value: boolean) => processing.push(value)),
        redraw: vi.fn(),
        createAttemptId: vi.fn(() => 'attempt-1'),
        hashPayload: vi.fn(async () => 'payload-hash'),
        now: vi.fn(() => new Date('2026-08-02T10:00:00.000Z')),
        onTransition: (state: UploadState) => transitions.push(state),
    } satisfies UploadCoordinatorDependencies
    return {
        coordinator: new UploadCoordinator(dependencies),
        dependencies,
        transitions,
        processing,
        features,
    }
}

describe('UploadCoordinator', () => {
    it('records payloads with a deterministic SHA-256 hash', async () => {
        await expect(hashUploadPayload('abc')).resolves.toBe(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
        )
    })

    it('executes the complete upload state machine and reconciles once', async () => {
        const harness = createHarness()

        const state = await harness.coordinator.start('Survey')

        expect(
            harness.transitions.map((transition) => transition.kind)
        ).toEqual([
            'validating',
            'creatingChangeset',
            'uploading',
            'receiptReceived',
            'reconciling',
            'succeeded',
        ])
        expect(state).toEqual({
            kind: 'succeeded',
            summary: { Total: 1, Create: 1, Update: 0, Delete: 0 },
        })
        expect(harness.processing).toEqual([true, false])
        expect(harness.dependencies.uploadDiff).toHaveBeenCalledOnce()
        expect(harness.dependencies.beginUploadAttempt).toHaveBeenCalledWith({
            journalVersion: 1,
            attemptId: 'attempt-1',
            payloadHash: 'payload-hash',
            changesetId: '123',
            submittedIds: ['node/-1'],
            summary: { Total: 1, Create: 1, Update: 0, Delete: 0 },
            startedAt: '2026-08-02T10:00:00.000Z',
            phase: 'prepared',
        })
        expect(
            harness.dependencies.acknowledgeUploadAttempt
        ).toHaveBeenCalledOnce()
        expect(
            harness.dependencies.applyAcknowledgedReceipt
        ).toHaveBeenCalledOnce()
        expect(
            harness.dependencies.clearAppliedUploadAttempt
        ).toHaveBeenCalledWith('attempt-1')
        expect(
            harness.dependencies.beginUploadAttempt.mock.invocationCallOrder[0]
        ).toBeLessThan(
            harness.dependencies.uploadDiff.mock.invocationCallOrder[0]
        )
        expect(
            harness.dependencies.acknowledgeUploadAttempt.mock
                .invocationCallOrder[0]
        ).toBeLessThan(
            harness.dependencies.applyAcknowledgedReceipt.mock
                .invocationCallOrder[0]
        )
        expect(
            harness.dependencies.applyAcknowledgedReceipt.mock
                .invocationCallOrder[0]
        ).toBeLessThan(
            harness.dependencies.clearAppliedUploadAttempt.mock
                .invocationCallOrder[0]
        )
        expect(harness.dependencies.redraw).toHaveBeenCalledOnce()
        expect(
            harness.dependencies.updateChangesetLastActivity
        ).toHaveBeenCalledOnce()
        const applied =
            harness.dependencies.applyAcknowledgedReceipt.mock.lastCall?.[1]
        expect(applied?.[0]).toMatchObject({
            oldId: 'node/-1',
            feature: {
                id: 'node/101',
                properties: {
                    id: 101,
                    meta: {
                        changeset: '123',
                        timestamp: '2026-08-02T10:00:00.000Z',
                        uid: '7',
                        user: 'Mapper',
                        version: 1,
                    },
                },
            },
        })
        expect(applied?.[0].feature?.properties.changeType).toBeUndefined()
    })

    it('shares one active attempt between concurrent callers', async () => {
        const upload$ = new Subject<unknown>()
        const harness = createHarness({ upload$ })

        const first = harness.coordinator.start('Survey')
        const second = harness.coordinator.start('Ignored duplicate')
        expect(first).toBe(second)
        await vi.waitFor(() =>
            expect(harness.coordinator.state()).toEqual({
                kind: 'uploading',
                attemptId: 'attempt-1',
            })
        )

        upload$.next(harness.features.map(receiptFor))
        upload$.complete()
        await Promise.all([first, second])

        expect(harness.dependencies.uploadDiff).toHaveBeenCalledOnce()
        expect(harness.processing).toEqual([true, false])
    })

    it('rejects an invalid local queue before any network request', async () => {
        const feature = queuedFeature('Create', -1)
        feature.id = 'node/0'
        const harness = createHarness({ features: [feature] })

        const state = await harness.coordinator.start('Survey')

        expect(state).toMatchObject({
            kind: 'failed',
            stage: 'validation',
            error: {
                queuePreserved: true,
                canClose: true,
                canRetry: true,
                recoveryAction: 'editQueue',
            },
        })
        expect(harness.dependencies.getUserDetail$).not.toHaveBeenCalled()
        expect(harness.dependencies.uploadDiff).not.toHaveBeenCalled()
        expect(harness.processing).toEqual([true, false])
    })

    it('reports an offline connection as retryable without creating a changeset', async () => {
        const harness = createHarness({
            connection$: throwError(() => new TimeoutError()),
        })

        const state = await harness.coordinator.start('Survey')

        expect(state).toMatchObject({
            kind: 'failed',
            stage: 'connection',
            error: {
                recoveryAction: 'reconnect',
                canRetry: true,
                queuePreserved: true,
            },
        })
        expect(harness.dependencies.getValidChangeset).not.toHaveBeenCalled()
    })

    it('routes an expired token to reauthentication', async () => {
        const harness = createHarness({
            connection$: throwError(() => ({
                status: 401,
                error: 'Authentication failed',
            })),
        })

        const state = await harness.coordinator.start('Survey')

        expect(state).toMatchObject({
            kind: 'failed',
            stage: 'connection',
            error: {
                status: 401,
                message: 'Authentication failed',
                recoveryAction: 'reauthenticate',
            },
        })
    })

    it('makes changeset creation failures safely retryable', async () => {
        const harness = createHarness({
            changeset$: throwError(() => ({
                status: 429,
                error: 'Too many requests',
            })),
        })

        const state = await harness.coordinator.start('Survey')

        expect(state).toMatchObject({
            kind: 'failed',
            stage: 'changeset',
            error: { recoveryAction: 'retry', canRetry: true },
        })
        expect(harness.dependencies.uploadDiff).not.toHaveBeenCalled()
    })

    it('invalidates a closed changeset and asks for a fresh one', async () => {
        const harness = createHarness({
            upload$: throwError(() => ({
                status: 409,
                error: 'The changeset 123 was closed at 2026-08-01T13:00:00Z.',
            })),
        })

        const state = await harness.coordinator.start('Survey')

        expect(state).toMatchObject({
            kind: 'failed',
            stage: 'upload',
            error: {
                recoveryAction: 'createChangeset',
                canRetry: true,
            },
        })
        expect(harness.dependencies.invalidateChangeset).toHaveBeenCalledOnce()
        expect(
            harness.dependencies.discardPreparedUploadAttempt
        ).toHaveBeenCalledWith('attempt-1')
    })

    it('does not resend automatically after an ambiguous upload response', async () => {
        const harness = createHarness({
            upload$: throwError(() => new TimeoutError()),
        })

        const first = await harness.coordinator.start('Survey')
        const second = await harness.coordinator.start('Survey again')

        expect(first).toMatchObject({
            kind: 'failed',
            stage: 'upload',
            error: {
                recoveryAction: 'inspectServer',
                canRetry: false,
                queuePreserved: true,
            },
        })
        expect(second).toBe(first)
        expect(harness.dependencies.uploadDiff).toHaveBeenCalledOnce()
    })

    it('identifies the queued feature involved in a version conflict', async () => {
        const feature = queuedFeature('Update', 12)
        const harness = createHarness({
            features: [feature],
            upload$: throwError(() => ({
                status: 409,
                error: 'Version mismatch: Provided 3, server had: 4 of Node 12',
            })),
        })

        const state = await harness.coordinator.start('Survey')

        expect(state).toMatchObject({
            kind: 'failed',
            stage: 'upload',
            error: { status: 409, feature: { id: 'node/12' } },
        })
        expect(
            harness.dependencies.discardPreparedUploadAttempt
        ).toHaveBeenCalledWith('attempt-1')
    })

    it.each([
        ['truncated', []],
        [
            'duplicated',
            [
                receiptFor(queuedFeature('Create', -1)),
                receiptFor(queuedFeature('Create', -1)),
            ],
        ],
        [
            'wrong type',
            [
                {
                    ...receiptFor(queuedFeature('Create', -1)),
                    type: 'way',
                },
            ],
        ],
        [
            'wrong creation version',
            [
                {
                    ...receiptFor(queuedFeature('Create', -1)),
                    new_version: 2,
                },
            ],
        ],
    ])('preserves the queue for a %s receipt', async (_name, result) => {
        const harness = createHarness({ upload$: of(result) })

        const state = await harness.coordinator.start('Survey')

        expect(state).toMatchObject({
            kind: 'failed',
            stage: 'reconciliation',
            error: {
                recoveryAction: 'resumeReconciliation',
                canRetry: false,
                queuePreserved: true,
            },
        })
        expect(
            harness.dependencies.applyAcknowledgedReceipt
        ).not.toHaveBeenCalled()
        expect(harness.dependencies.uploadDiff).toHaveBeenCalledOnce()
    })

    it('never resends after storage fails following the server acknowledgement', async () => {
        const harness = createHarness({
            applyReceipt: async () => {
                throw new Error('IndexedDB write failed')
            },
        })

        const first = await harness.coordinator.start('Survey')
        const second = await harness.coordinator.start('Survey again')

        expect(
            harness.transitions.map((transition) => transition.kind)
        ).toEqual([
            'validating',
            'creatingChangeset',
            'uploading',
            'receiptReceived',
            'reconciling',
            'failed',
        ])
        expect(first).toMatchObject({
            kind: 'failed',
            stage: 'reconciliation',
            error: {
                message: 'IndexedDB write failed',
                recoveryAction: 'resumeReconciliation',
                canRetry: false,
            },
        })
        expect(second).toBe(first)
        expect(harness.dependencies.uploadDiff).toHaveBeenCalledOnce()
        expect(
            harness.dependencies.applyAcknowledgedReceipt
        ).toHaveBeenCalledOnce()
        expect(
            harness.dependencies.updateChangesetLastActivity
        ).toHaveBeenCalledOnce()
        expect(harness.processing).toEqual([true, false])
    })

    it('treats a prepared journal after restart as server-ambiguous', async () => {
        const feature = queuedFeature('Create', -1)
        const harness = createHarness({
            features: [feature],
            journal: { ...journalBase(feature), phase: 'prepared' },
        })

        const state = await harness.coordinator.recoverJournal()

        expect(state).toMatchObject({
            kind: 'failed',
            stage: 'upload',
            error: {
                recoveryAction: 'inspectServer',
                canRetry: false,
                queuePreserved: true,
            },
        })
        expect(harness.dependencies.uploadDiff).not.toHaveBeenCalled()
        expect(
            harness.dependencies.clearAppliedUploadAttempt
        ).not.toHaveBeenCalled()
    })

    it('reconciles an acknowledged journal after restart without resending', async () => {
        const feature = queuedFeature('Create', -1)
        const harness = createHarness({
            features: [feature],
            journal: acknowledgedJournal(feature),
        })

        const state = await harness.coordinator.recoverJournal()

        expect(
            harness.transitions.map((transition) => transition.kind)
        ).toEqual(['receiptReceived', 'reconciling', 'succeeded'])
        expect(state).toMatchObject({ kind: 'succeeded' })
        expect(harness.dependencies.uploadDiff).not.toHaveBeenCalled()
        expect(
            harness.dependencies.applyAcknowledgedReceipt
        ).toHaveBeenCalledOnce()
        expect(
            harness.dependencies.clearAppliedUploadAttempt
        ).toHaveBeenCalledWith('attempt-1')
        expect(harness.processing).toEqual([true, false])
    })

    it('only clears an already-applied journal after restart', async () => {
        const feature = queuedFeature('Create', -1)
        const acknowledged = acknowledgedJournal(feature)
        if (acknowledged.phase !== 'acknowledged') {
            throw new Error('Invalid acknowledged journal fixture.')
        }
        const journal: PersistedUploadJournal = {
            ...acknowledged,
            phase: 'applied',
            appliedAt: '2026-08-02T10:00:01.000Z',
        }
        const harness = createHarness({ features: [], journal })

        const state = await harness.coordinator.recoverJournal()

        expect(state).toMatchObject({ kind: 'succeeded' })
        expect(harness.dependencies.uploadDiff).not.toHaveBeenCalled()
        expect(
            harness.dependencies.applyAcknowledgedReceipt
        ).not.toHaveBeenCalled()
        expect(
            harness.dependencies.clearAppliedUploadAttempt
        ).toHaveBeenCalledWith('attempt-1')
    })

    it('blocks resubmission when the acknowledgement journal cannot be persisted', async () => {
        const harness = createHarness({
            acknowledgeUploadAttempt: async () => {
                throw new Error('IndexedDB write failed')
            },
        })

        const first = await harness.coordinator.start('Survey')
        const second = await harness.coordinator.start('Survey again')

        expect(first).toMatchObject({
            kind: 'failed',
            stage: 'upload',
            error: {
                message: 'IndexedDB write failed',
                recoveryAction: 'inspectServer',
                canRetry: false,
            },
        })
        expect(second).toBe(first)
        expect(harness.dependencies.uploadDiff).toHaveBeenCalledOnce()
        expect(
            harness.dependencies.applyAcknowledgedReceipt
        ).not.toHaveBeenCalled()
    })
})
