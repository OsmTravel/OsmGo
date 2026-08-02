import {
    type ComponentFixture,
    TestBed,
    waitForAsync,
} from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { BasemapsService } from '@app/services/basemaps.service'
import { NavController } from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import { ConfigService } from '@services/config.service'
import { InitService } from '@services/init.service'
import { MapService } from '@services/map.service'
import { of, Subject } from 'rxjs'
import { BasemapsComponent } from './basemaps.component'

describe('BasemapsComponent', () => {
    let fixture: ComponentFixture<BasemapsComponent>
    let basemaps$: Subject<Array<{ id: string; name: string }>>

    beforeEach(waitForAsync(() => {
        basemaps$ = new Subject()

        TestBed.configureTestingModule({
            imports: [BasemapsComponent, TranslateModule.forRoot()],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: { params: of({ lat: '48', lng: '2' }) },
                },
                {
                    provide: BasemapsService,
                    useValue: { getBasemaps$: () => basemaps$ },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        config: () => ({ basemap: { id: 'selected' } }),
                    },
                },
                { provide: InitService, useValue: { isLoaded: true } },
                {
                    provide: MapService,
                    useValue: { displaySatelliteBaseMap: vi.fn() },
                },
                { provide: NavController, useValue: { back: vi.fn() } },
            ],
        }).compileComponents()

        fixture = TestBed.createComponent(BasemapsComponent)
        fixture.autoDetectChanges()
    }))

    it('renders asynchronously loaded basemaps without manual change detection', async () => {
        basemaps$.next([
            { id: 'selected', name: 'Selected map' },
            { id: 'other', name: 'Other map' },
        ])
        await fixture.whenStable()

        const cards = fixture.nativeElement.querySelectorAll('ion-card')

        expect(cards).toHaveLength(2)
        expect(cards[0].classList.contains('selectedCard')).toBe(true)
        expect(cards[1].classList.contains('selectedCard')).toBe(false)
    })
})
