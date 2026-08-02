import { TestBed } from '@angular/core/testing'
import type {
    OsmGoChangeType,
    OsmGoFeature,
    OsmGoFeatureCollection,
} from '@osmgo/type'
import { AppStorage } from '@services/app-storage.service'
import { DataService, type OsmDownload } from '@services/data.service'
import {
    OsmStatePersistenceError,
    type PersistedOsmStateV2,
} from '@services/osm-state'
import { featureCollection, point } from '@turf/turf'
import { firstValueFrom } from 'rxjs'

type StorageSpy = {
    get: ReturnType<typeof vi.fn>
    set: ReturnType<typeof vi.fn>
    keys: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
    clear: ReturnType<typeof vi.fn>
}

const emptyCollection = (): OsmGoFeatureCollection =>
    featureCollection([]) as OsmGoFeatureCollection

function osmFeature(
    id: number,
    changeType?: OsmGoChangeType,
    originalData?: OsmGoFeature | null
): OsmGoFeature {
    return {
        ...point(
            [id, id],
            {
                changeType,
                hexColor: '#000000',
                icon: 'bench',
                id,
                marker: 'circle-gray-bench',
                meta: {
                    changeset: '',
                    timestamp: '',
                    uid: '',
                    user: '',
                    version: changeType === 'Create' ? 0 : 1,
                },
                originalData,
                primaryTag: { key: 'amenity', value: 'bench' },
                tags: { amenity: 'bench' },
                type: 'node',
            },
            { id: `node/${id}` }
        ),
    } as OsmGoFeature
}

const collection = (features: OsmGoFeature[]): OsmGoFeatureCollection =>
    featureCollection(features) as OsmGoFeatureCollection

const download = (
    features: OsmGoFeature[],
    geojsonBbox = emptyCollection()
): OsmDownload => ({ geojson: collection(features), geojsonBbox })

describe('DataService', () => {
    let service: DataService
    let storageSpy: StorageSpy

    beforeEach(() => {
        storageSpy = {
            get: vi.fn().mockName('Storage.get').mockResolvedValue(null),
            set: vi
                .fn()
                .mockName('Storage.set')
                .mockImplementation((_key: string, value: unknown) =>
                    Promise.resolve(value)
                ),
            keys: vi.fn().mockName('Storage.keys'),
            remove: vi.fn().mockName('Storage.remove'),
            clear: vi.fn().mockName('Storage.clear'),
        }
        TestBed.configureTestingModule({
            providers: [{ provide: AppStorage, useValue: storageSpy }],
        })
        service = TestBed.inject(DataService)
    })

    it('notifies Angular after a pending command is durably committed', async () => {
        expect(service.changedFeatureCount()).toBe(0)

        const created = await service.createPendingFeature(osmFeature(99))

        expect(created.id).toBe('node/-1')
        expect(service.changedFeatureCount()).toBe(1)

        await service.cancelPendingChange('node/-1')

        expect(service.changedFeatureCount()).toBe(0)
    })

    describe('state loading and migration', () => {
        it('migrates legacy keys without deleting rollback data', async () => {
            const official = osmFeature(10)
            const legacyCreate = osmFeature(0, 'Create')
            const empty = emptyCollection()
            storageSpy.get.mockImplementation((key: string) => {
                if (key === 'osmState') return Promise.resolve(null)
                if (key === 'geojson') {
                    return Promise.resolve(collection([official]))
                }
                if (key === 'geojsonChanged') {
                    return Promise.resolve(collection([legacyCreate]))
                }
                if (key === 'geojsonBbox') return Promise.resolve(empty)
                return Promise.resolve(null)
            })

            const state = await firstValueFrom(service.loadOsmState$())

            expect(state).toMatchObject({
                schemaVersion: 2,
                revision: 0,
                nextTemporaryId: -2,
            })
            expect(Object.keys(state.officialById)).toEqual(['node/10'])
            expect(Object.keys(state.pendingById)).toEqual(['node/-1'])
            expect(service.getGeojsonChanged().features[0].id).toBe('node/-1')
            expect(storageSpy.set).toHaveBeenCalledWith('osmState', state)
            expect(storageSpy.remove).not.toHaveBeenCalled()
        })

        it('loads V2 directly and resumes its temporary ID allocator', async () => {
            const official = osmFeature(10)
            const persisted: PersistedOsmStateV2 = {
                schemaVersion: 2,
                revision: 7,
                officialById: { 'node/10': official },
                pendingById: {},
                bbox: emptyCollection(),
                nextTemporaryId: -4,
            }
            storageSpy.get.mockResolvedValue(persisted)

            await firstValueFrom(service.loadOsmState$())
            const created = await service.createPendingFeature(osmFeature(99))

            expect(storageSpy.get).toHaveBeenCalledTimes(1)
            expect(storageSpy.get).toHaveBeenCalledWith('osmState')
            expect(created.id).toBe('node/-4')
            expect(service.getGeojson().features).toEqual([official])
        })
    })

    describe('serialized persistence', () => {
        it('persists one revision at a time and publishes only acknowledged state', async () => {
            let resolveFirstWrite!: (value: unknown) => void
            const firstWrite = new Promise((resolve) => {
                resolveFirstWrite = resolve
            })
            const persistedStates: PersistedOsmStateV2[] = []
            storageSpy.set.mockImplementation(
                (_key: string, state: PersistedOsmStateV2) => {
                    persistedStates.push(structuredClone(state))
                    return persistedStates.length === 1
                        ? firstWrite
                        : Promise.resolve(state)
                }
            )
            const firstFeature = osmFeature(1)
            const secondFeature = osmFeature(2)

            const firstMutation = service.applyDownload(
                download([firstFeature])
            )
            const secondMutation = service.applyDownload(
                download([secondFeature])
            )
            await Promise.resolve()

            expect(storageSpy.set).toHaveBeenCalledTimes(1)
            expect(service.getGeojson().features).toEqual([])

            resolveFirstWrite(undefined)
            await Promise.all([firstMutation, secondMutation])

            expect(persistedStates.map((state) => state.revision)).toEqual([
                1, 2,
            ])
            expect(Object.keys(persistedStates[0].officialById)).toEqual([
                'node/1',
            ])
            expect(Object.keys(persistedStates[1].officialById)).toEqual([
                'node/2',
            ])
            expect(service.getGeojson().features).toEqual([secondFeature])
        })

        it('keeps memory unchanged, exposes the cause and continues after failure', async () => {
            const failedCause = new Error('IndexedDB unavailable')
            storageSpy.set
                .mockRejectedValueOnce(failedCause)
                .mockImplementation(
                    (_key: string, state: PersistedOsmStateV2) =>
                        Promise.resolve(state)
                )

            await expect(
                service.applyDownload(download([osmFeature(1)]))
            ).rejects.toMatchObject({
                name: 'OsmStatePersistenceError',
                operation: 'apply download',
                revision: 1,
                cause: failedCause,
            } satisfies Partial<OsmStatePersistenceError>)
            expect(service.getGeojson().features).toEqual([])

            await service.applyDownload(download([osmFeature(2)]))

            expect(service.getGeojson().features).toEqual([osmFeature(2)])
            expect(storageSpy.set).toHaveBeenLastCalledWith(
                'osmState',
                expect.objectContaining({ revision: 1 })
            )
        })
    })

    describe('atomic commands', () => {
        it('applies a download and its bbox in one cloned snapshot', async () => {
            const official = osmFeature(10)
            const bbox = collection([osmFeature(999)])

            await service.applyDownload(download([official], bbox))
            official.properties.tags.name = 'mutated input'
            bbox.features.length = 0

            expect(storageSpy.set).toHaveBeenCalledTimes(1)
            expect(service.getGeojson().features[0].properties.tags.name).toBe(
                undefined
            )
            expect(service.getGeojsonBbox().features).toHaveLength(1)
        })

        it('rejects duplicate downloaded IDs before scheduling persistence', () => {
            const duplicate = osmFeature(1)

            expect(() =>
                service.applyDownload(download([duplicate, duplicate]))
            ).toThrow('duplicate IDs')
            expect(storageSpy.set).not.toHaveBeenCalled()
        })

        it('rejects an inconsistent canonical feature ID', () => {
            const inconsistent = osmFeature(1)
            inconsistent.id = 'way/1'

            expect(() =>
                service.applyDownload(download([inconsistent]))
            ).toThrow('inconsistent canonical ID')
            expect(storageSpy.set).not.toHaveBeenCalled()
        })

        it('allocates temporary IDs inside the create command', async () => {
            const first = await service.createPendingFeature(osmFeature(99))
            const second = await service.createPendingFeature(osmFeature(99))
            const third = await service.createPendingFeature(osmFeature(99))

            expect([first.id, second.id, third.id]).toEqual([
                'node/-1',
                'node/-2',
                'node/-3',
            ])
            expect(
                service
                    .getGeojsonChanged()
                    .features.map((feature) => feature.properties.id)
            ).toEqual([-1, -2, -3])
        })

        it('moves an official feature to pending in one write', async () => {
            const original = osmFeature(10)
            await service.applyDownload(download([original]))
            storageSpy.set.mockClear()
            const patch = osmFeature(10)
            patch.properties.tags.name = 'Edited bench'

            const changed = await service.moveOfficialToPending(
                'node/10',
                patch
            )

            expect(storageSpy.set).toHaveBeenCalledTimes(1)
            expect(service.getGeojson().features).toEqual([])
            expect(changed.properties.changeType).toBe('Update')
            expect(changed.properties.originalData).toEqual(original)
            expect(service.getGeojsonChanged().features).toEqual([changed])
        })

        it('leaves official and pending data unchanged if an atomic move fails', async () => {
            const original = osmFeature(10)
            await service.applyDownload(download([original]))
            storageSpy.set.mockRejectedValueOnce(new Error('disk full'))

            await expect(
                service.moveOfficialToPending('node/10', osmFeature(10))
            ).rejects.toBeInstanceOf(OsmStatePersistenceError)

            expect(service.getGeojson().features).toEqual([original])
            expect(service.getGeojsonChanged().features).toEqual([])
        })

        it('updates pending content while preserving its transition metadata', async () => {
            const original = osmFeature(10)
            await service.applyDownload(download([original]))
            await service.moveOfficialToPending('node/10', osmFeature(10))
            const patch = osmFeature(999)
            patch.properties.tags.name = 'Second edit'

            const updated = await service.updatePendingFeature('node/10', patch)

            expect(updated.id).toBe('node/10')
            expect(updated.properties.id).toBe(10)
            expect(updated.properties.changeType).toBe('Update')
            expect(updated.properties.originalData).toEqual(original)
            expect(updated.properties.tags.name).toBe('Second edit')
        })

        it('deleting a local creation cancels it atomically', async () => {
            const created = await service.createPendingFeature(osmFeature(99))

            const result = await service.markPendingDeleted(String(created.id))

            expect(result).toBeUndefined()
            expect(service.getGeojsonChanged().features).toEqual([])
        })

        it('marks an official feature deleted and cancellation restores it', async () => {
            const original = osmFeature(10)
            await service.applyDownload(download([original]))

            const deleted = await service.markPendingDeleted('node/10')

            expect(service.getGeojson().features).toEqual([])
            expect(deleted?.properties.changeType).toBe('Delete')
            expect(deleted?.properties.originalData).toEqual(original)

            await service.cancelPendingChange('node/10')

            expect(service.getGeojsonChanged().features).toEqual([])
            expect(service.getGeojson().features).toEqual([original])
        })

        it('rejects cancellation when an update has lost its original data', async () => {
            const invalid = osmFeature(10, 'Update', null)
            await service.replacePendingFeatures(collection([invalid]))

            await expect(
                service.cancelPendingChange('node/10')
            ).rejects.toThrow('original feature data is missing')
            expect(service.getGeojsonChanged().features).toEqual([invalid])
        })

        it('cancels every pending transition in one durable write', async () => {
            const first = osmFeature(10)
            const second = osmFeature(11)
            await service.applyDownload(download([first, second]))
            await service.moveOfficialToPending('node/10', osmFeature(10))
            await service.markPendingDeleted('node/11')
            await service.createPendingFeature(osmFeature(99))
            storageSpy.set.mockClear()

            await service.cancelAllPendingChanges()

            expect(storageSpy.set).toHaveBeenCalledTimes(1)
            expect(service.getGeojsonChanged().features).toEqual([])
            expect(
                service
                    .getGeojson()
                    .features.map((feature) => feature.id)
                    .sort()
            ).toEqual(['node/10', 'node/11'])
            const created = await service.createPendingFeature(osmFeature(99))
            expect(created.id).toBe('node/-1')
        })

        it('resets downloaded data without discarding pending edits', async () => {
            await service.applyDownload(download([osmFeature(10)]))
            const created = await service.createPendingFeature(osmFeature(99))

            const empty = await service.resetDownloadedData()

            expect(empty.geojson.features).toEqual([])
            expect(empty.geojsonBbox.features).toEqual([])
            expect(service.getGeojson().features).toEqual([])
            expect(service.getGeojsonChanged().features).toEqual([created])
        })

        it('resets every OSM collection and restarts allocation', async () => {
            await service.applyDownload(download([osmFeature(10)]))
            await service.createPendingFeature(osmFeature(99))

            await service.resetAllData()
            const created = await service.createPendingFeature(osmFeature(99))

            expect(service.getGeojson().features).toEqual([])
            expect(service.getGeojsonBbox().features).toEqual([])
            expect(service.getGeojsonChanged().features).toEqual([created])
            expect(created.id).toBe('node/-1')
        })
    })

    describe('upload receipt', () => {
        it('persists every journal phase around one atomic reconciliation', async () => {
            const pending = osmFeature(-1, 'Create')
            await service.replacePendingFeatures(collection([pending]))
            storageSpy.set.mockClear()
            const prepared = {
                journalVersion: 1 as const,
                attemptId: 'attempt-1',
                payloadHash: 'payload-hash',
                changesetId: '123',
                submittedIds: ['node/-1'],
                summary: {
                    Total: 1,
                    Create: 1,
                    Update: 0,
                    Delete: 0,
                },
                startedAt: '2026-08-02T10:00:00.000Z',
                phase: 'prepared' as const,
            }

            await service.beginUploadAttempt(prepared)
            await service.acknowledgeUploadAttempt(
                'attempt-1',
                [{ osmgoOldId: 'node/-1' }],
                '2026-08-02T10:00:01.000Z'
            )
            await service.applyAcknowledgedUploadReceipt(
                'attempt-1',
                [{ oldId: 'node/-1', feature: osmFeature(101) }],
                '2026-08-02T10:00:02.000Z'
            )

            expect(service.getUploadJournal()).toMatchObject({
                phase: 'applied',
                attemptId: 'attempt-1',
                appliedAt: '2026-08-02T10:00:02.000Z',
            })
            expect(service.getGeojsonChanged().features).toEqual([])
            expect(service.getGeojson().features).toEqual([osmFeature(101)])

            await service.clearAppliedUploadAttempt('attempt-1')

            const snapshots = storageSpy.set.mock.calls.map(
                (call) => call[1] as PersistedOsmStateV2
            )
            expect(
                snapshots.map((state) => state.uploadJournal?.phase)
            ).toEqual(['prepared', 'acknowledged', 'applied', undefined])
            expect(service.getUploadJournal()).toBeUndefined()
        })

        it('keeps an acknowledged journal when local reconciliation fails', async () => {
            const pending = osmFeature(-1, 'Create')
            await service.replacePendingFeatures(collection([pending]))
            await service.beginUploadAttempt({
                journalVersion: 1,
                attemptId: 'attempt-1',
                payloadHash: 'payload-hash',
                changesetId: '123',
                submittedIds: ['node/-1'],
                summary: {
                    Total: 1,
                    Create: 1,
                    Update: 0,
                    Delete: 0,
                },
                startedAt: '2026-08-02T10:00:00.000Z',
                phase: 'prepared',
            })
            await service.acknowledgeUploadAttempt(
                'attempt-1',
                [{ osmgoOldId: 'node/-1' }],
                '2026-08-02T10:00:01.000Z'
            )

            await expect(
                service.applyAcknowledgedUploadReceipt(
                    'attempt-1',
                    [{ oldId: 'node/-999', feature: osmFeature(101) }],
                    '2026-08-02T10:00:02.000Z'
                )
            ).rejects.toThrow('does not match local data')

            expect(service.getUploadJournal()?.phase).toBe('acknowledged')
            expect(service.getGeojsonChanged().features).toEqual([pending])
        })

        it('reconciles one hundred creations in one write', async () => {
            const pending = Array.from({ length: 100 }, (_value, index) =>
                osmFeature(-(index + 1), 'Create')
            )
            await service.replacePendingFeatures(collection(pending))
            storageSpy.set.mockClear()

            await service.applyUploadReceipt(
                pending.map((feature, index) => ({
                    oldId: String(feature.id),
                    feature: osmFeature(index + 1),
                }))
            )

            expect(storageSpy.set).toHaveBeenCalledTimes(1)
            expect(service.getGeojsonChanged().features).toEqual([])
            expect(service.getGeojson().features).toHaveLength(100)
        })

        it('keeps entries that are not part of the receipt', async () => {
            const first = osmFeature(-1, 'Create')
            const second = osmFeature(-2, 'Create')
            await service.replacePendingFeatures(collection([first, second]))

            await service.applyUploadReceipt([
                { oldId: 'node/-1', feature: osmFeature(101) },
            ])

            expect(service.getGeojsonChanged().features).toEqual([second])
            expect(service.getGeojson().features).toEqual([osmFeature(101)])
        })

        it('rejects duplicate or unknown receipt IDs without changing state', async () => {
            const pending = osmFeature(-1, 'Create')
            await service.replacePendingFeatures(collection([pending]))

            await expect(
                service.applyUploadReceipt([
                    { oldId: 'node/-1', feature: osmFeature(101) },
                    { oldId: 'node/-999', feature: osmFeature(102) },
                ])
            ).rejects.toThrow('does not match local data')

            expect(service.getGeojsonChanged().features).toEqual([pending])
            expect(service.getGeojson().features).toEqual([])
        })

        it('keeps memory unchanged if receipt persistence fails', async () => {
            const pending = osmFeature(-1, 'Create')
            const official = osmFeature(50)
            await service.applyDownload(download([official]))
            await service.replacePendingFeatures(collection([pending]))
            storageSpy.set.mockRejectedValueOnce(new Error('disk full'))

            await expect(
                service.applyUploadReceipt([
                    { oldId: 'node/-1', feature: osmFeature(101) },
                ])
            ).rejects.toBeInstanceOf(OsmStatePersistenceError)

            expect(service.getGeojsonChanged().features).toEqual([pending])
            expect(service.getGeojson().features).toEqual([official])
        })
    })

    describe('immutable reads', () => {
        it('looks up records directly and returns detached snapshots', async () => {
            const official = osmFeature(1)
            const pending = osmFeature(-1, 'Create')
            await service.applyDownload(download([official]))
            await service.replacePendingFeatures(collection([pending]))

            const officialRead = service.getFeatureById('node/1', 'data')
            const pendingRead = service.getFeatureById(
                'node/-1',
                'data_changed'
            )
            if (!officialRead || !pendingRead) {
                throw new Error('Expected seeded features to be readable.')
            }
            officialRead.properties.tags.name = 'mutated read'
            pendingRead.properties.tags.name = 'mutated read'

            expect(
                service.getFeatureById('node/missing', 'data')
            ).toBeUndefined()
            expect(service.getFeatureById('node/1', 'data')).toEqual(official)
            expect(service.getFeatureById('node/-1', 'data_changed')).toEqual(
                pending
            )
        })

        it('does not expose mutable collections or bbox state', async () => {
            const bbox = collection([osmFeature(999)])
            await service.applyDownload(download([osmFeature(1)], bbox))

            service.getGeojson().features.length = 0
            service.getGeojsonBbox().features.length = 0

            expect(service.getGeojson().features).toHaveLength(1)
            expect(service.getGeojsonBbox().features).toHaveLength(1)
        })
    })

    describe('cache helpers', () => {
        it('writes and reads icon cache entries', async () => {
            service.addIconCache('foobar', 'foo:bar')
            storageSpy.get.mockResolvedValue('foo:bar')

            expect(await service.getIconCache('foobar')).toBe('foo:bar')
            expect(storageSpy.set).toHaveBeenCalledWith('foobar', 'foo:bar')
        })

        it('filters and clears icon cache keys', async () => {
            storageSpy.keys.mockResolvedValue([
                'abc',
                'circle_abc',
                'square_def',
                'penta_ghi',
            ])

            expect(await service.clearIconCache()).toBe(3)
            expect(storageSpy.remove).toHaveBeenCalledTimes(3)
        })
    })
})
