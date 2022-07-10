import { Storage } from '@ionic/storage'
import { featureCollection, point } from '@turf/turf'
import {
    FeatureProperties,
    OsmGoFeature,
    OsmGoFeatureCollection,
} from '@osmgo/type'
import { DataService } from '@services/data.service'

describe('DataService', () => {
    let service: DataService
    let storageSpy: jasmine.SpyObj<Storage>

    beforeEach(() => {
        storageSpy = jasmine.createSpyObj<Storage>('Storage', [
            'get',
            'set',
            'keys',
            'remove',
            'clear',
        ])
        service = new DataService(storageSpy)
    })

    it('makeEmptyGeoJsonFC should create empty feature collection', () => {
        const fc = DataService.makeEmptyGeoJsonFC()
        expect(fc.type).toEqual('FeatureCollection')
        expect(fc.features.length).toBe(0)
    })

    it('should be possible to clear data cache', async () => {
        // preparation
        const _deleteDatabase = window.indexedDB.deleteDatabase
        const deleteDatabaseSpy = jasmine.createSpy()
        window.indexedDB.deleteDatabase = deleteDatabaseSpy

        const _clear = localStorage.clear
        const clearSpy = jasmine.createSpy()
        localStorage.clear = clearSpy

        // test
        await service.clearCache()

        expect(storageSpy.clear.calls.count()).toBe(1)
        expect(deleteDatabaseSpy.calls.count()).toBe(1)
        expect(clearSpy.calls.count()).toBe(1)

        // cleanup
        window.indexedDB.deleteDatabase = _deleteDatabase
        localStorage.clear = _clear
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
        it('should be possible to get next free id', async () => {
            const feature = point([0, 0], { id: -10 }) as OsmGoFeature
            const fc = featureCollection([feature]) as OsmGoFeatureCollection
            await service.setGeojsonChanged(fc)
            ;(service as any).forceNextFeatureIdSync() // ids have been set manually -> force refresh

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
            ;(service as any).forceNextFeatureIdSync() // ids have been set manually -> force refresh

            await service.replaceIdGenerateByOldVersion()

            const actual = service.getGeojsonChanged().features
            expect(actual[0].properties.id).toBe(0)
            expect(actual[0].id).toBe('foo/0')

            expect(actual[1].properties.id).toBe(-1)
            expect(actual[1].id).toBe('foo/-1')
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
    })

    describe('getFeatureById', () => {
        it('should be possible to retrieve a feature by its prop id (source: data)', () => {
            // Preparation
            const featureA = point([1, 0], {
                id: 1,
            }) as unknown as OsmGoFeature
            const featureB = point([2, 0], {
                id: 2,
            }) as unknown as OsmGoFeature
            const fc = featureCollection([
                featureA,
                featureB,
            ]) as OsmGoFeatureCollection
            service.setGeojson(fc)

            // test
            const actual = service.getFeatureById(2, 'data')

            expect(actual).toEqual(featureB)
        })

        it('should be possible to retrieve a feature by its prop id (source: data_changed)', async () => {
            // Preparation
            const featureA = point([1, 0], {
                id: 1,
            }) as unknown as OsmGoFeature
            const featureB = point([2, 0], {
                id: 2,
            }) as unknown as OsmGoFeature
            const fc = featureCollection([
                featureA,
                featureB,
            ]) as OsmGoFeatureCollection
            await service.setGeojsonChanged(fc)

            // test
            const actual = service.getFeatureById(2, 'data_changed')

            expect(actual).toEqual(featureB)
        })

        it('should return null if no feature could be found', () => {
            // Preparation
            const fc = featureCollection([]) as OsmGoFeatureCollection
            service.setGeojson(fc)

            // test
            const actual = service.getFeatureById(2, 'data')

            expect(actual).toBeNull()
        })
    })

    describe('icon cache', () => {
        it('should be possible to write into icon cache', () => {
            service.addIconCache('foobar', 'foo:bar')
            expect(storageSpy.set.calls.count()).toBe(1)
            expect(storageSpy.set.calls.mostRecent().args).toEqual([
                'foobar',
                'foo:bar',
            ])
        })

        it('should be possible to read from icon cache', async () => {
            storageSpy.get.and.returnValue(Promise.resolve('foo:bar'))
            const actual = await service.getIconCache('foobar')
            expect(storageSpy.get.calls.count()).toBe(1)
            expect(actual).toBe('foo:bar')
        })

        it('should be possible to read icon keys from cache (filtered by certain prefixes)', async () => {
            storageSpy.keys.and.returnValue(
                Promise.resolve([
                    'abc',
                    'def',
                    'circle_abc',
                    'square_def',
                    'penta_ghi',
                ])
            )
            const actual = await service.getKeysCacheIcon()
            expect(actual.length).toBe(3)
            expect(actual[0]).toBe('circle_abc')
            expect(actual[1]).toBe('square_def')
            expect(actual[2]).toBe('penta_ghi')
        })

        it('should be possible to clear the icon cache', async () => {
            service.getKeysCacheIcon = () => Promise.resolve(['foo', 'bar'])
            const actual = await service.clearIconCache()
            expect(storageSpy.remove.calls.count()).toBe(2)
            expect(storageSpy.remove.calls.mostRecent().args).toEqual(['bar'])
            expect(actual).toBe(2)
        })
    })

    describe('read/write geojson data', () => {
        describe('geojson', () => {
            it('should be possible to read geojson data', async () => {
                const sample = featureCollection([point([0, 0])])
                storageSpy.get.and.returnValue(Promise.resolve(sample))
                const obs = service.loadGeojson$()
                const actual = await obs.toPromise()
                expect(storageSpy.get.calls.mostRecent().args).toEqual([
                    'geojson',
                ])
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(1)
            })

            it('should return empty feature collection if no data is stored', async () => {
                storageSpy.get.and.returnValue(Promise.resolve(undefined))
                const obs = service.loadGeojson$()
                const actual = await obs.toPromise()
                expect(storageSpy.get.calls.mostRecent().args).toEqual([
                    'geojson',
                ])
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(0)
            })

            it('should be possible to set geojson data', () => {
                const fc = featureCollection([
                    point([0, 0]),
                ]) as OsmGoFeatureCollection

                service.setGeojson(fc)

                expect(service.geojson).toEqual(fc)
                expect(storageSpy.set.calls.count()).toBe(1)
                expect(storageSpy.set.calls.mostRecent().args).toEqual([
                    'geojson',
                    fc,
                ])

                // test if object has been deeply cloned
                fc.features[0].properties.id = 123

                expect(service.geojson).not.toEqual(fc)
            })

            it('should be possible to add a feature to geojson collection', () => {
                expect(service.getGeojson().features.length).toBe(0)

                const newFeature = point([1, 2]) as OsmGoFeature
                service.addFeatureToGeojson(newFeature)

                expect(service.getGeojson().features.length).toBe(1)
            })

            describe('modify/delete feature', () => {
                let featureA: OsmGoFeature
                let featureB: OsmGoFeature
                beforeEach(() => {
                    // Preparation
                    featureA = point([0, 0]) as OsmGoFeature
                    featureA.id = 123
                    featureB = point([0, 0]) as OsmGoFeature
                    featureB.id = 234
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
                const featureA = point([0, 0]) as OsmGoFeature
                const fc = featureCollection([
                    featureA,
                ]) as OsmGoFeatureCollection

                service.setGeojson(fc)

                expect(service.getGeojson().features.length).toBe(1)

                service.resetGeojsonData()

                expect(service.getGeojson().features.length).toBe(0)
                expect(storageSpy.set.calls.mostRecent().args).toEqual([
                    'geojson',
                    featureCollection([]),
                ])
            })
        })

        describe('geojsonChanged', () => {
            it('should be possible to read changed geojson data', async () => {
                const sample = featureCollection([point([0, 0])])
                storageSpy.get.and.returnValue(Promise.resolve(sample))
                const obs = service.loadGeojsonChanged$()
                const actual = await obs.toPromise()
                expect(storageSpy.get.calls.mostRecent().args).toEqual([
                    'geojsonChanged',
                ])
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(1)
            })

            it('should return empty feature collection if no data is stored', async () => {
                storageSpy.get.and.returnValue(Promise.resolve(undefined))
                const obs = service.loadGeojsonChanged$()
                const actual = await obs.toPromise()
                expect(storageSpy.get.calls.mostRecent().args).toEqual([
                    'geojsonChanged',
                ])
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(0)
            })

            it('should be possible to add a feature to changed geojson collection', () => {
                expect(service.getGeojsonChanged().features.length).toBe(0)

                const newFeature = point([1, 2]) as OsmGoFeature
                service.addFeatureToGeojsonChanged(newFeature)

                expect(service.getGeojsonChanged().features.length).toBe(1)
            })

            it('should be able to determine the number of changed features', async () => {
                expect(service.getCountGeojsonChanged()).toBe(0)

                const newFeature = point([1, 2]) as OsmGoFeature
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
                    featureA.id = 123
                    featureB = point([0, 0]) as OsmGoFeature
                    featureB.id = 234
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
                const featureA = point([0, 0]) as OsmGoFeature
                const fc = featureCollection([
                    featureA,
                ]) as OsmGoFeatureCollection

                await service.setGeojsonChanged(fc)

                expect(service.getGeojsonChanged().features.length).toBe(1)

                await service.resetGeojsonChanged()

                expect(service.getGeojsonChanged().features.length).toBe(0)
                expect(storageSpy.set.calls.mostRecent().args).toEqual([
                    'geojsonChanged',
                    featureCollection([]),
                ])
            })
        })

        describe('geojsonBbox', () => {
            it('should be possible to read bbox geojson data', async () => {
                const sample = featureCollection([point([0, 0])])
                storageSpy.get.and.returnValue(Promise.resolve(sample))
                const obs = service.loadGeojsonBbox$()
                const actual = await obs.toPromise()
                expect(storageSpy.get.calls.mostRecent().args).toEqual([
                    'geojsonBbox',
                ])
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(1)
            })

            it('should return empty feature collection if no data is stored', async () => {
                storageSpy.get.and.returnValue(Promise.resolve(undefined))
                const obs = service.loadGeojsonBbox$()
                const actual = await obs.toPromise()
                expect(storageSpy.get.calls.mostRecent().args).toEqual([
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
                expect(storageSpy.set.calls.count()).toBe(1)
                expect(storageSpy.set.calls.mostRecent().args).toEqual([
                    'geojsonBbox',
                    fc,
                ])
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
