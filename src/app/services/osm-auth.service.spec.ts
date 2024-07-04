import { TestBed } from '@angular/core/testing'

import { OsmAuthService } from './osm-auth.service'

describe('OsmAuthService', () => {
    let service: OsmAuthService

    beforeEach(() => {
        TestBed.configureTestingModule({})
        service = TestBed.inject(OsmAuthService)
    })

    it('should be created', () => {
        expect(service).toBeTruthy()
    })
})
