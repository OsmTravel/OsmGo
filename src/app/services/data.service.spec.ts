import { Storage } from '@ionic/storage'
import { feature, featureCollection, point } from '@turf/turf'
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
        })
    })
})
