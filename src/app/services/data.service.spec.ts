import { Storage } from '@ionic/storage'
import { feature, featureCollection, point } from '@turf/turf'
import { DataService } from './data.service'

describe('DataService', () => {
    let service: DataService
    let storageSpy: jasmine.SpyObj<Storage>

    beforeEach(() => {
        storageSpy = jasmine.createSpyObj<Storage>('Storage', ['get', 'set'])
        service = new DataService(storageSpy)
    })

    it('makeEmptyGeoJsonFC should create empty feature collection', () => {
        const fc = DataService.makeEmptyGeoJsonFC()
        expect(fc.type).toEqual('FeatureCollection')
        expect(fc.features.length).toBe(0)
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
    })

    describe('read/write geojson data', () => {
        describe('geojson', () => {
            it('should be possible to read geojson data', async () => {
                const sample = featureCollection([point([0, 0])])
                storageSpy.get.and.returnValue(Promise.resolve(sample))
                const obs = service.loadGeojson$()
                const actual = await obs.toPromise()
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(1)
            })

            it('should return empty feature collection if no data is stored', async () => {
                storageSpy.get.and.returnValue(Promise.resolve(undefined))
                const obs = service.loadGeojson$()
                const actual = await obs.toPromise()
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
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(1)
            })

            it('should return empty feature collection if no data is stored', async () => {
                storageSpy.get.and.returnValue(Promise.resolve(undefined))
                const obs = service.loadGeojsonChanged$()
                const actual = await obs.toPromise()
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
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(1)
            })

            it('should return empty feature collection if no data is stored', async () => {
                storageSpy.get.and.returnValue(Promise.resolve(undefined))
                const obs = service.loadGeojsonBbox$()
                const actual = await obs.toPromise()
                expect(actual.type).toBe('FeatureCollection')
                expect(actual.features.length).toBe(0)
            })
        })
    })
})
