import { DataService } from './data.service'

describe('DataService', () => {
    let service: DataService

    beforeEach(() => {
        service = new DataService(null)
    })

    it('makeEmptyGeoJsonFC should create empty feature collection', () => {
        const fc = DataService.makeEmptyGeoJsonFC()
        expect(fc.type).toEqual('FeatureCollection')
        expect(fc.features.length).toEqual(0)
    })
})
