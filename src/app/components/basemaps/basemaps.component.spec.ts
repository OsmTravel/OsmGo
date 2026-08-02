import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { type Basemap, BasemapsService } from '@app/services/basemaps.service'
import { TranslateModule } from '@ngx-translate/core'
import { ConfigService } from '@services/config.service'
import { InitService } from '@services/init.service'
import { MapService } from '@services/map.service'
import { OverlayNavigationService } from '@services/overlay-navigation.service'
import { of, Subject } from 'rxjs'
import { BasemapsComponent } from './basemaps.component'

describe('BasemapsComponent', () => {
    let fixture: ComponentFixture<BasemapsComponent>
    let basemaps$: Subject<Array<{ id: string; name: string }>>
    let displaySatelliteBaseMap: ReturnType<typeof vi.fn>
    let setBasemap: ReturnType<typeof vi.fn>
    let closeOverlay: ReturnType<typeof vi.fn>

    beforeEach(async () => {
        basemaps$ = new Subject()
        displaySatelliteBaseMap = vi.fn().mockName('displaySatelliteBaseMap')
        setBasemap = vi.fn().mockName('setBasemap')
        closeOverlay = vi.fn().mockName('close').mockResolvedValue(true)

        await TestBed.configureTestingModule({
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
                        setBasemap,
                    },
                },
                { provide: InitService, useValue: { isLoaded: true } },
                {
                    provide: MapService,
                    useValue: { displaySatelliteBaseMap },
                },
                {
                    provide: OverlayNavigationService,
                    useValue: { close: closeOverlay },
                },
            ],
        }).compileComponents()

        fixture = TestBed.createComponent(BasemapsComponent)
        fixture.autoDetectChanges()
    })

    it('renders asynchronously loaded basemaps without manual change detection', async () => {
        basemaps$.next([
            { id: 'selected', name: 'Selected map' },
            { id: 'other', name: 'Other map' },
        ])
        await fixture.whenStable()

        const cards = fixture.nativeElement.querySelectorAll('.basemap-card')

        expect(cards).toHaveLength(2)
        expect(cards[0].classList.contains('is-selected')).toBe(true)
        expect(cards[1].classList.contains('is-selected')).toBe(false)
    })

    it('updates the map before persisting the selected basemap', () => {
        const calls: string[] = []
        displaySatelliteBaseMap.mockImplementation(() => calls.push('map'))
        setBasemap.mockImplementation(() => calls.push('config'))
        closeOverlay.mockImplementation(() => {
            calls.push('close')
            return Promise.resolve(true)
        })
        const basemap: Basemap = {
            id: 'other',
            name: 'Other map',
            tiles: ['https://tiles.test/{z}/{x}/{y}.png'],
        }

        fixture.componentInstance.selectBaseMap(basemap)

        expect(calls).toEqual(['map', 'config', 'close'])
    })
})
