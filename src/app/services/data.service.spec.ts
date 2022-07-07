import { Storage } from '@ionic/storage'
import { feature, featureCollection, point } from '@turf/turf'
import { OsmGoFeature, OsmGoFeatureCollection } from 'src/type'
import { DataService } from './data.service'

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

            describe('moddify/delete feature', () => {
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
