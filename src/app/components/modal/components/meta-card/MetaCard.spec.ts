import { TestBed } from '@angular/core/testing'
import { TranslateModule } from '@ngx-translate/core'

import { MetaCard } from './MetaCard'

describe('MetaCard', () => {
    it('counts both boolean and list references to ways', () => {
        TestBed.configureTestingModule({
            imports: [MetaCard, TranslateModule.forRoot()],
        })
        const fixture = TestBed.createComponent(MetaCard)

        fixture.componentRef.setInput('feature', {
            properties: {
                meta: { timestamp: 0, version: 1 },
                usedByWays: true,
            },
        })
        expect(fixture.componentInstance.usedByWaysCount()).toBe(1)

        fixture.componentRef.setInput('feature', {
            properties: {
                meta: { timestamp: 0, version: 1 },
                usedByWays: ['way/1', 'way/2'],
            },
        })
        expect(fixture.componentInstance.usedByWaysCount()).toBe(2)
    })
})
