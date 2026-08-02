import { TestBed } from '@angular/core/testing'
import {
    FeatureProperties,
    OsmGoFeature,
    OsmGoFeatureCollection,
} from '@osmgo/type'
import { AppStorage } from '@services/app-storage.service'
import { DataService } from '@services/data.service'
import { featureCollection, point } from '@turf/turf'
import { firstValueFrom } from 'rxjs'

function pointFeature(
    id: string,
    coordinates: [number, number] = [0, 0]
): OsmGoFeature {
    return point(coordinates, {}, { id }) as OsmGoFeature
}

describe('DataService', () => {
    let service: DataService
    let storageSpy: any

    beforeEach(() => {
        storageSpy = {
            get: vi.fn().mockName('Storage.get'),
            set: vi.fn().mockName('Storage.set'),
            keys: vi.fn().mockName('Storage.keys'),
            remove: vi.fn().mockName('Storage.remove'),
            clear: vi.fn().mockName('Storage.clear'),
        }
        TestBed.configureTestingModule({
            providers: [{ provide: AppStorage, useValue: storageSpy }],
        })
        service = TestBed.inject(DataService)
    })

    it('notifies Angular when the changed feature count changes', () => {
        const feature = point([0, 0], {}, { id: 'node/1' }) as OsmGoFeature

        expect(service.changedFeatureCount()).toBe(0)

        service.addFeatureToGeojsonChanged(feature)

        expect(service.changedFeatureCount()).toBe(1)

        service.deleteFeatureFromGeojsonChanged(feature)

        expect(service.changedFeatureCount()).toBe(0)
    })

    it('should be possible to clear data cache', async () => {
        const originalIndexedDB = window.indexedDB
        const deleteDatabaseSpy = vi.fn()
        Object.defineProperty(window, 'indexedDB', {
            configurable: true,
            value: { deleteDatabase: deleteDatabaseSpy },
        })
        const clearSpy = vi.spyOn(Storage.prototype, 'clear')

        try {
            await service.clearCache()

            expect(storageSpy.clear).toHaveBeenCalledTimes(1)
            expect(deleteDatabaseSpy).toHaveBeenCalledTimes(1)
            expect(clearSpy).toHaveBeenCalledTimes(1)
        } finally {
            clearSpy.mockRestore()
            Object.defineProperty(window, 'indexedDB', {
                configurable: true,
                value: originalIndexedDB,
            })
        }
    })

    it('migrates legacy map keys to a V2 OsmState without removing them', async () => {
        const official = pointFeature('node/10')
        official.properties.id = 10
        official.properties.type = 'node'
        const pending = pointFeature('node/0')
        pending.properties.id = 0
        pending.properties.type = 'node'
        pending.properties.changeType = 'Create'
        const empty = featureCollection([]) as OsmGoFeatureCollection
        storageSpy.get.mockImplementation((key: string) => {
            if (key === 'osmState') return Promise.resolve(null)
            if (key === 'geojson') {
                return Promise.resolve(featureCollection([official]))
            }
            if (key === 'geojsonChanged') {
                return Promise.resolve(featureCollection([pending]))
            }
            if (key === 'geojsonBbox') return Promise.resolve(empty)
            return Promise.resolve(null)
        })
        storageSpy.set.mockImplementation((_key: string, value: unknown) =>
            Promise.resolve(value)
        )

        const state = await firstValueFrom(service.loadOsmState$())

        expect(state).toMatchObject({
            schemaVersion: 2,
            revision: 0,
            nextTemporaryId: -2,
        })
        expect(Object.keys(state.officialById)).toEqual(['node/10'])
        expect(Object.keys(state.pendingById)).toEqual(['node/-1'])
        expect(service.getGeojson().features[0].id).toBe('node/10')
        expect(service.getGeojsonChanged().features[0].id).toBe('node/-1')
        expect(service.nextFeatureId).toBe(-2)
        expect(storageSpy.set).toHaveBeenCalledWith('osmState', state)
        expect(storageSpy.remove).not.toHaveBeenCalled()
    })

    it('loads an existing V2 OsmState without consulting legacy keys', async () => {
        const official = pointFeature('node/10')
        const persisted = {
            schemaVersion: 2,
            revision: 7,
            officialById: { 'node/10': official },
            pendingById: {},
            bbox: featureCollection([]),
            nextTemporaryId: -4,
        }
        storageSpy.get.mockResolvedValue(persisted)

        const state = await firstValueFrom(service.loadOsmState$())

        expect(state).toEqual(persisted)
        expect(storageSpy.get).toHaveBeenCalledTimes(1)
        expect(storageSpy.get).toHaveBeenCalledWith('osmState')
        expect(storageSpy.set).not.toHaveBeenCalled()
        expect(service.getGeojson().features).toEqual([official])
        expect(service.nextFeatureId).toBe(-4)
    })

    it('should be possible to copy data from changed model to original', async () => {
        const originalFeature = point([0, 0], {}, { id: 3 }) as OsmGoFeature
        const originalFc = featureCollection([
            originalFeature,
        ]) as OsmGoFeatureCollection

        const changedFeature = point(
            [0, 0],
            {
                hexColor: '#ccc',
            },
            { id: 3 }
        ) as OsmGoFeature
        const changedFc = featureCollection([
            changedFeature,
        ]) as OsmGoFeatureCollection

        service.setGeojson(originalFc)
        await service.setGeojsonChanged(changedFc)

        const actual = service.getMergedGeojsonGeojsonChanged()

        expect(originalFc.features.length).toBe(1)
        expect(changedFc.features.length).toBe(1)

        expect(actual.features[0]).toEqual(changedFeature)
        expect(service.getGeojson().features[0]).toEqual(changedFeature)
    })

    describe('id generation/handling', () => {
        it('starts with strictly negative temporary IDs', () => {
            expect(service.nextFeatureId).toBe(-1)
            expect(service.nextFeatureId).toBe(-2)
            expect(service.nextFeatureId).toBe(-3)
        })

        it('should be possible to get next free id', async () => {
            const feature = pointFeature('node/-10')
            feature.properties.id = -10
            const fc = featureCollection([feature]) as OsmGoFeatureCollection
            await service.setGeojsonChanged(fc)

            let actual = service.nextFeatureId
            expect(actual).toBe(-11)
            actual = service.nextFeatureId
            expect(actual).toBe(-12)
        })

        it('should be possible to replace old id format with new id format', async () => {
            const featureA = point(
                [0, 0],
                {
                    id: 'tmp_123' as any,
                    changeType: 'Create',
                    type: 'foo',
                },
                { id: 'tmp_123' }
            ) as OsmGoFeature
            const featureB = point(
                [0, 0],
                {
                    id: 123,
                    changeType: 'Create',
                    type: 'foo',
                },
                { id: 123 }
            ) as OsmGoFeature
            const fc = featureCollection([
                featureA,
                featureB,
            ]) as OsmGoFeatureCollection
            await service.setGeojsonChanged(fc)

            await service.replaceIdGenerateByOldVersion()

            const actual = service.getGeojsonChanged().features
            expect(actual[0].properties.id).toBe(-1)
            expect(actual[0].id).toBe('foo/-1')

            expect(actual[1].properties.id).toBe(-2)
            expect(actual[1].id).toBe('foo/-2')
        })

        it('restores the counter below pending IDs after a restart', async () => {
            const feature = pointFeature('node/-7')
            feature.properties.id = -7
            storageSpy.get.mockResolvedValue(
                featureCollection([feature]) as OsmGoFeatureCollection
            )

            await firstValueFrom(service.loadGeojsonChanged$())

            expect(service.nextFeatureId).toBe(-8)
        })

        it('migrates legacy IDs without colliding with negative IDs', async () => {
            const existing = pointFeature('node/-2')
            existing.properties.id = -2
            existing.properties.type = 'node'
            existing.properties.changeType = 'Create'
            const legacy = pointFeature('tmp_123')
            legacy.properties.id = 'tmp_123' as any
            legacy.properties.type = 'node'
            legacy.properties.changeType = 'Create'
            await service.setGeojsonChanged(
                featureCollection([existing, legacy]) as OsmGoFeatureCollection
            )

            await service.replaceIdGenerateByOldVersion()

            expect(
                service
                    .getGeojsonChanged()
                    .features.map((feature) => feature.id)
                    .sort()
            ).toEqual(['node/-2', 'node/-3'])
        })

        it('restarts allocation at -1 after pending data is reset', async () => {
            expect(service.nextFeatureId).toBe(-1)

            await service.resetGeojsonChanged()

            expect(service.nextFeatureId).toBe(-1)
        })
    })

    describe('cancel feature change', () => {
        it('cancel newly created feature', async () => {
            const originalFeature = point([0, 0], {}, { id: 3 }) as OsmGoFeature
            const changedFeature = point<Partial<FeatureProperties>>(
                [0, 0],
                {
                    changeType: 'Create',
                    originalData: originalFeature,
                },
                { id: 3 }
            ) as OsmGoFeature
            const changedFc = featureCollection([
                changedFeature,
            ]) as OsmGoFeatureCollection

            await service.setGeojsonChanged(changedFc)

            service.cancelFeatureChange(changedFeature)

            // Copy of original feature in `originalData` property should have been re-created in the original data
            // expect(service.getGeojson().features[0]).toEqual(originalFeature)
            // Feature must be deleted in the changed feature collection ...
            expect(service.getGeojsonChanged().features.length).toBe(0)
            // ... and it should not appear in the original dataset
            expect(service.getGeojson().features.length).toBe(0)
        })

        it('cancel updated feature', async () => {
            const originalFeature = point([0, 0], {}, { id: 3 }) as OsmGoFeature
            const changedFeature = point<Partial<FeatureProperties>>(
                [0, 0],
                {
                    changeType: 'Update',
                    originalData: originalFeature,
                },
                { id: 3 }
            ) as OsmGoFeature
            const changedFc = featureCollection([
                changedFeature,
            ]) as OsmGoFeatureCollection

            await service.setGeojsonChanged(changedFc)

            service.cancelFeatureChange(changedFeature)

            // Feature must be deleted in the changed feature collection ...
            expect(service.getGeojsonChanged().features.length).toBe(0)

            // ...and a copy of the original feature in `originalData` property
            // should have been re-created in the original data
            expect(service.getGeojson().features[0]).toEqual(originalFeature)
        })

        it('keeps an update when its original data is missing', async () => {
            const changedFeature = pointFeature('node/3')
            changedFeature.properties.changeType = 'Update'
            changedFeature.properties.originalData = null
            await service.setGeojsonChanged(
                featureCollection([changedFeature]) as OsmGoFeatureCollection
            )

            expect(() => service.cancelFeatureChange(changedFeature)).toThrow(
                'The original feature data is missing.'
            )
            expect(service.getGeojsonChanged().features).toEqual([
                changedFeature,
            ])
        })
    })

    describe('upload results', () => {
        function createdFeature(id: number): OsmGoFeature {
            const properties: FeatureProperties = {
                hexColor: '#000000',
                icon: '',
                id,
                marker: '',
                meta: {
                    changeset: '',
                    timestamp: '',
                    uid: '',
                    user: '',
                    version: 0,
                },
                primaryTag: { key: 'amenity', value: 'bench' },
                tags: { amenity: 'bench' },
                type: 'node',
                changeType: 'Create',
            }
            return {
                ...point([id, id], properties),
                id: `node/${id}`,
            }
        }

        it('applies one hundred confirmed creations in one batch', async () => {
            const changedFeatures = Array.from({ length: 100 }, (_value, i) =>
                createdFeature(-(i + 1))
            )
            await service.setGeojsonChanged(
                featureCollection(changedFeatures) as OsmGoFeatureCollection
            )
            storageSpy.set.mockClear()
            const results = changedFeatures.map((feature, i) => ({
                oldId: feature.id as string,
                feature: createdFeature(i + 1),
            }))

            await service.applyUploadResults(results)

            expect(service.getGeojsonChanged().features).toEqual([])
            expect(service.getGeojson().features.length).toBe(100)
            expect(
                vi
                    .mocked(storageSpy.set)
                    .mock.calls.map((args: unknown[]) => args[0])
            ).toEqual(['geojson', 'geojsonChanged', 'osmState'])
        })

        it('keeps every feature that was not confirmed', async () => {
            const first = createdFeature(-1)
            const second = createdFeature(-2)
            await service.setGeojsonChanged(
                featureCollection([first, second]) as OsmGoFeatureCollection
            )

            await service.applyUploadResults([
                { oldId: first.id as string, feature: createdFeature(101) },
            ])

            expect(
                service
                    .getGeojsonChanged()
                    .features.map((feature) => feature.id)
            ).toEqual(['node/-2'])
            expect(
                service.getGeojson().features.map((feature) => feature.id)
            ).toEqual(['node/101'])
        })

        it('does not change local data when a result is invalid', async () => {
            const first = createdFeature(-1)
            const second = createdFeature(-2)
            await service.setGeojsonChanged(
                featureCollection([first, second]) as OsmGoFeatureCollection
            )

            await expect(
                service.applyUploadResults([
                    {
                        oldId: first.id as string,
                        feature: createdFeature(101),
                    },
                    {
                        oldId: 'node/-999',
                        feature: createdFeature(102),
                    },
                ])
            ).rejects.toThrow()

            expect(
                service
                    .getGeojsonChanged()
                    .features.map((feature) => feature.id)
            ).toEqual(['node/-1', 'node/-2'])
            expect(service.getGeojson().features).toEqual([])
        })

        it('keeps local data when persistence fails', async () => {
            const changedFeature = createdFeature(-1)
            const officialFeature = createdFeature(50)
            service.setGeojson(
                featureCollection([officialFeature]) as OsmGoFeatureCollection
            )
            await service.setGeojsonChanged(
                featureCollection([changedFeature]) as OsmGoFeatureCollection
            )
            storageSpy.set.mockImplementation((key: string) =>
                key === 'geojsonChanged'
                    ? Promise.reject(new Error('Storage unavailable'))
                    : Promise.resolve()
            )

            await expect(
                service.applyUploadResults([
                    {
                        oldId: changedFeature.id as string,
                        feature: createdFeature(101),
                    },
                ])
            ).rejects.toThrow()

            expect(
                service
                    .getGeojsonChanged()
                    .features.map((feature) => feature.id)
            ).toEqual(['node/-1'])
            expect(
                service.getGeojson().features.map((feature) => feature.id)
            ).toEqual(['node/50'])
        })
    })

    describe('getFeatureById', () => {
        it('should be possible to retrieve a feature by its prop id (source: data)', () => {
            // Preparation
            const featureA = {
                type: 'Feature',
                id: 'node/1',
                properties: {},
                geometry: { type: 'Point', coordinates: [1, 0] },
            } as OsmGoFeature
            const featureB = {
                type: 'Feature',
                id: 'node/2',
                properties: {},
                geometry: { type: 'Point', coordinates: [2, 0] },
            } as OsmGoFeature
            const fc = featureCollection([
                featureA,
                featureB,
            ]) as OsmGoFeatureCollection
            service.setGeojson(fc)

            // test
            const actual = service.getFeatureById('node/2', 'data')

            expect(actual).toEqual(featureB)
        })

        it('should be possible to retrieve a feature by its prop id (source: data_changed)', async () => {
            // Preparation
            const featureA = {
                type: 'Feature',
                id: 'node/1',
                properties: {},
                geometry: { type: 'Point', coordinates: [1, 0] },
            } as OsmGoFeature
            const featureB = {
                type: 'Feature',
                id: 'node/2',
                properties: {},
                geometry: { type: 'Point', coordinates: [2, 0] },
            } as OsmGoFeature
            const fc = featureCollection([
                featureA,
                featureB,
            ]) as OsmGoFeatureCollection
            await service.setGeojsonChanged(fc)

            // test
            const actual = service.getFeatureById('node/2', 'data_changed')

            expect(actual).toEqual(featureB)
        })

        it('should return null if no feature could be found', () => {
            // Preparation
            const fc = featureCollection([]) as OsmGoFeatureCollection
            service.setGeojson(fc)

            // test
            const actual = service.getFeatureById('node/2', 'data')

            expect(actual).toBeUndefined()
        })
    })

    describe('icon cache', () => {
        it('should be possible to write into icon cache', () => {
            service.addIconCache('foobar', 'foo:bar')
            expect(vi.mocked(storageSpy.set).mock.calls.length).toBe(1)
            expect(vi.mocked(storageSpy.set).mock.lastCall).toEqual([
                'foobar',
                'foo:bar',
            ])
        })

        it('should be possible to read from icon cache', async () => {
            storageSpy.get.mockResolvedValue('foo:bar')
            const actual = await service.getIconCache('foobar')
            expect(vi.mocked(storageSpy.get).mock.calls.length).toBe(1)
            expect(actual).toBe('foo:bar')
        })

        it('should be possible to read icon keys from cache (filtered by certain prefixes)', async () => {
            storageSpy.keys.mockResolvedValue([
                'abc',
                'def',
                'circle_abc',
                'square_def',
                'penta_ghi',
            ])
            const actual = await service.getKeysCacheIcon()
            expect(actual.length).toBe(3)
            expect(actual[0]).toBe('circle_abc')
            expect(actual[1]).toBe('square_def')
            expect(actual[2]).toBe('penta_ghi')
        })

        it('should be possible to clear the icon cache', async () => {
            service.getKeysCacheIcon = () => Promise.resolve(['foo', 'bar'])
            const actual = await service.clearIconCache()
            expect(vi.mocked(storageSpy.remove).mock.calls.length).toBe(2)
            expect(vi.mocked(storageSpy.remove).mock.lastCall).toEqual(['bar'])
            expect(actual).toBe(2)
        })
    })

    describe('read/write geojson data', () => {
        describe('geojson', () => {
            it('should be possible to read geojson data', async () => {
                const sample = featureCollection([pointFeature('node/1')])
                storageSpy.get.mockResolvedValue(sample)
                const obs = service.loadGeojson$()
                const actual = await firstValueFrom(obs)
                expect(vi.mocked(storageSpy.get).mock.lastCall).toEqual([
                    'geojson',
                ])
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(1)
            })

            it('should return empty feature collection if no data is stored', async () => {
                storageSpy.get.mockResolvedValue(undefined)
                const obs = service.loadGeojson$()
                const actual = await firstValueFrom(obs)
                expect(vi.mocked(storageSpy.get).mock.lastCall).toEqual([
                    'geojson',
                ])
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(0)
            })

            it('should be possible to set geojson data', () => {
                const fc = featureCollection([
                    pointFeature('node/1'),
                ]) as OsmGoFeatureCollection

                service.setGeojson(fc)

                expect(service.geojson).toEqual(fc)
                expect(vi.mocked(storageSpy.set).mock.calls.length).toBe(2)
                expect(storageSpy.set).toHaveBeenCalledWith('geojson', fc)
                expect(storageSpy.set).toHaveBeenCalledWith(
                    'osmState',
                    expect.objectContaining({ schemaVersion: 2 })
                )

                // test if object has been deeply cloned
                fc.features[0].properties.id = 123

                expect(service.geojson).not.toEqual(fc)
            })

            it('keeps existing data when a feature ID is missing', () => {
                const existingFeature = pointFeature('node/1')
                service.setGeojson(
                    featureCollection([
                        existingFeature,
                    ]) as OsmGoFeatureCollection
                )
                const featureWithoutId = point([1, 2]) as OsmGoFeature

                expect(() =>
                    service.setGeojson(
                        featureCollection([
                            featureWithoutId,
                        ]) as OsmGoFeatureCollection
                    )
                ).toThrow('A feature ID is required.')
                expect(service.getGeojson().features).toEqual([existingFeature])
            })

            it('should be possible to add a feature to geojson collection', () => {
                expect(service.getGeojson().features.length).toBe(0)

                const newFeature = pointFeature('node/1', [1, 2])
                service.addFeatureToGeojson(newFeature)

                expect(service.getGeojson().features.length).toBe(1)
            })

            describe('modify/delete feature', () => {
                let featureA: OsmGoFeature
                let featureB: OsmGoFeature
                beforeEach(() => {
                    // Preparation
                    featureA = point([0, 0]) as OsmGoFeature
                    featureA.id = 'node/123'
                    featureB = point([0, 0]) as OsmGoFeature
                    featureB.id = 'node/234'
                    const fc = featureCollection([
                        featureA,
                        featureB,
                    ]) as OsmGoFeatureCollection

                    service.setGeojson(fc)

                    expect(service.getGeojson().features.length).toBe(2)
                })

                it('should update a feature based on its id', () => {
                    // Prepare feature update
                    const newFeature = point([1, 2]) as OsmGoFeature
                    newFeature.id = featureA.id
                    newFeature.properties.hexColor = '#ccc'

                    // Apply feature update
                    service.updateFeatureToGeojson(newFeature)

                    // Test if collection has been updated correctly
                    expect(
                        service
                            .getGeojson()
                            .features.find(
                                (feature) => feature.id === featureA.id
                            )
                    ).toEqual(newFeature)
                })

                it('should delete feature based on its id', () => {
                    // Prepare feature deletion
                    const deletionFeature = point([1, 2]) as OsmGoFeature
                    deletionFeature.id = featureA.id

                    service.deleteFeatureFromGeojson(deletionFeature)

                    expect(
                        service
                            .getGeojson()
                            .features.find(
                                (feature) => feature.id === featureA.id
                            )
                    ).toBeUndefined()
                })
            })

            it('should be possible to reset data', () => {
                const featureA = pointFeature('node/1')
                const fc = featureCollection([
                    featureA,
                ]) as OsmGoFeatureCollection

                service.setGeojson(fc)

                expect(service.getGeojson().features.length).toBe(1)

                service.resetGeojsonData()

                expect(service.getGeojson().features.length).toBe(0)
                expect(storageSpy.set).toHaveBeenCalledWith(
                    'geojson',
                    featureCollection([])
                )
            })
        })

        describe('geojsonChanged', () => {
            it('should be possible to read changed geojson data', async () => {
                const sample = featureCollection([pointFeature('node/1')])
                storageSpy.get.mockResolvedValue(sample)
                const obs = service.loadGeojsonChanged$()
                const actual = await firstValueFrom(obs)
                expect(vi.mocked(storageSpy.get).mock.lastCall).toEqual([
                    'geojsonChanged',
                ])
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(1)
            })

            it('should return empty feature collection if no data is stored', async () => {
                storageSpy.get.mockResolvedValue(undefined)
                const obs = service.loadGeojsonChanged$()
                const actual = await firstValueFrom(obs)
                expect(vi.mocked(storageSpy.get).mock.lastCall).toEqual([
                    'geojsonChanged',
                ])
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(0)
            })

            it('should be possible to add a feature to changed geojson collection', () => {
                expect(service.getGeojsonChanged().features.length).toBe(0)

                const newFeature = pointFeature('node/1', [1, 2])
                service.addFeatureToGeojsonChanged(newFeature)

                expect(service.getGeojsonChanged().features.length).toBe(1)
            })

            it('should be able to determine the number of changed features', async () => {
                expect(service.getCountGeojsonChanged()).toBe(0)

                const newFeature = pointFeature('node/1', [1, 2])
                const fc = featureCollection([
                    newFeature,
                ]) as OsmGoFeatureCollection

                await service.setGeojsonChanged(fc)

                expect(service.getCountGeojsonChanged()).toBe(1)
            })

            describe('modify/delete feature', () => {
                let featureA: OsmGoFeature
                let featureB: OsmGoFeature

                beforeEach(async () => {
                    // Preparation
                    featureA = point([0, 0]) as OsmGoFeature
                    featureA.id = 'node/123'
                    featureB = point([0, 0]) as OsmGoFeature
                    featureB.id = 'node/234'
                    const fc = featureCollection([
                        featureA,
                        featureB,
                    ]) as OsmGoFeatureCollection

                    await service.setGeojsonChanged(fc)

                    expect(service.getGeojsonChanged().features.length).toBe(2)
                })

                it('should update a feature based on its id', () => {
                    // Prepare feature update
                    const newFeature = point([1, 2]) as OsmGoFeature
                    newFeature.id = featureA.id
                    newFeature.properties.hexColor = '#ccc'

                    // Apply feature update
                    service.updateFeatureToGeojsonChanged(newFeature)

                    // Test if collection has been updated correctly
                    expect(
                        service
                            .getGeojsonChanged()
                            .features.find(
                                (feature) => feature.id === featureA.id
                            )
                    ).toEqual(newFeature)
                })

                it('should delete feature based on its id', () => {
                    // Prepare feature deletion
                    const deletionFeature = point([1, 2]) as OsmGoFeature
                    deletionFeature.id = featureA.id

                    service.deleteFeatureFromGeojsonChanged(deletionFeature)

                    expect(
                        service
                            .getGeojsonChanged()
                            .features.find(
                                (feature) => feature.id === featureA.id
                            )
                    ).toBeUndefined()
                })
            })

            it('should be possible to reset data', async () => {
                const featureA = pointFeature('node/1')
                const fc = featureCollection([
                    featureA,
                ]) as OsmGoFeatureCollection

                await service.setGeojsonChanged(fc)

                expect(service.getGeojsonChanged().features.length).toBe(1)

                await service.resetGeojsonChanged()

                expect(service.getGeojsonChanged().features.length).toBe(0)
                expect(storageSpy.set).toHaveBeenCalledWith(
                    'geojsonChanged',
                    featureCollection([])
                )
            })
        })

        describe('geojsonBbox', () => {
            it('should be possible to read bbox geojson data', async () => {
                const sample = featureCollection([point([0, 0])])
                storageSpy.get.mockResolvedValue(sample)
                const obs = service.loadGeojsonBbox$()
                const actual = await firstValueFrom(obs)
                expect(vi.mocked(storageSpy.get).mock.lastCall).toEqual([
                    'geojsonBbox',
                ])
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(1)
            })

            it('should return empty feature collection if no data is stored', async () => {
                storageSpy.get.mockResolvedValue(undefined)
                const obs = service.loadGeojsonBbox$()
                const actual = await firstValueFrom(obs)
                expect(vi.mocked(storageSpy.get).mock.lastCall).toEqual([
                    'geojsonBbox',
                ])
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(0)
            })

            it('should be possible to write bbox geojson data', () => {
                const fc = featureCollection([
                    point([0, 0]),
                ]) as OsmGoFeatureCollection
                service.setGeojsonBbox(fc)

                expect(service.geojsonBbox).toEqual(fc)
                // ensure that data is persisted in storage
                expect(vi.mocked(storageSpy.set).mock.calls.length).toBe(2)
                expect(storageSpy.set).toHaveBeenCalledWith('geojsonBbox', fc)
                expect(storageSpy.set).toHaveBeenCalledWith(
                    'osmState',
                    expect.objectContaining({ schemaVersion: 2 })
                )
            })

            it('should be possible to get bbox geojson data', () => {
                const fc = featureCollection([
                    point([0, 0]),
                ]) as OsmGoFeatureCollection
                service.geojsonBbox = fc

                const actual = service.getGeojsonBbox()

                expect(actual).toEqual(fc)
            })

            it('should be possible to reset bbox geojson data', () => {
                const fc = featureCollection([
                    point([0, 0]),
                ]) as OsmGoFeatureCollection
                service.setGeojsonBbox(fc)

                expect(service.getGeojsonBbox().features.length).toBe(1)

                const actual = service.resetGeojsonBbox()

                expect(service.getGeojsonBbox().features.length).toBe(0)
                expect(actual.features.length).toEqual(0)
            })
        })
    })
})
