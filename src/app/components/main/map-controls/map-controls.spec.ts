import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { LocationService } from '@services/location.service'
import { MapService } from '@services/map.service'

import { MapControlsComponent } from './map-controls'

describe('MapControlsComponent', () => {
    const isProcessing = signal(false)

    beforeEach(() => {
        isProcessing.set(false)
        TestBed.configureTestingModule({
            imports: [MapControlsComponent, TranslateModule.forRoot()],
            providers: [
                {
                    provide: ConfigService,
                    useValue: {
                        currentZoom: () => 18,
                        getBasemap: () => ({}),
                    },
                },
                {
                    provide: DataService,
                    useValue: { changedFeatureCount: () => 0 },
                },
                {
                    provide: LocationService,
                    useValue: { gpsIsReady: () => false },
                },
                {
                    provide: MapService,
                    useValue: {
                        centerOnMyPosition: vi.fn(),
                        displaySatelliteBaseMap: vi.fn(),
                        isDisplaySatelliteBaseMap: () => false,
                        isProcessing,
                        loadingData: () => false,
                        markerMoveMoving: () => false,
                        markerMoving: () => false,
                    },
                },
                { provide: Router, useValue: { navigate: vi.fn() } },
            ],
        })

        const translate = TestBed.inject(TranslateService)
        translate.setTranslation('fr', {
            MAIN: {
                BUTTONS: {
                    ADD_NEW: 'Créer un objet',
                    CENTER_GPS: 'Centrer la carte sur ma position',
                    LOAD_DATA: 'Télécharger les données',
                    LOADING_DATA: 'Chargement',
                    MENU: 'Menu',
                    REFRESH_DATA: 'Actualiser',
                    VIEW_AREAL_MAP: 'Imagerie aérienne',
                },
            },
        })
        translate.use('fr')
    })

    it('renders refresh as the explicit primary map action', () => {
        const fixture = TestBed.createComponent(MapControlsComponent)
        const refreshRequested = vi.fn()
        fixture.componentInstance.refreshRequested.subscribe(refreshRequested)
        fixture.detectChanges()

        const refreshButton = fixture.nativeElement.querySelector(
            '[data-testid="load-osm-data"]'
        ) as HTMLButtonElement

        expect(refreshButton.classList).toContain('refresh-button')
        expect(refreshButton.textContent).toContain('Actualiser')
        expect(refreshButton.disabled).toBe(false)

        refreshButton.click()

        expect(refreshRequested).toHaveBeenCalledOnce()
    })

    it('groups basemap, map actions and creation into three rail zones', () => {
        const fixture = TestBed.createComponent(MapControlsComponent)
        fixture.detectChanges()

        const rail = fixture.nativeElement.querySelector(
            '.map-action-dock--browse'
        ) as HTMLElement
        const basemap = rail.querySelector(
            '[data-testid="toggle-basemap"]'
        ) as HTMLElement
        const center = rail.querySelector('.map-action-group') as HTMLElement
        const refresh = center.querySelector(
            '[data-testid="load-osm-data"]'
        ) as HTMLElement
        const geolocation = center.querySelector(
            '[data-testid="center-on-gps"]'
        ) as HTMLElement
        const add = rail.querySelector('[data-testid="add-poi"]') as HTMLElement

        expect(basemap.parentElement).toBe(rail)
        expect(refresh.parentElement).toBe(center)
        expect(geolocation.parentElement).toBe(center)
        expect(add.parentElement).toBe(rail)
    })

    it('keeps an explicit loading state on the primary action', () => {
        const fixture = TestBed.createComponent(MapControlsComponent)
        isProcessing.set(true)
        fixture.detectChanges()

        const refreshButton = fixture.nativeElement.querySelector(
            '[data-testid="load-osm-data"]'
        ) as HTMLButtonElement

        expect(refreshButton.textContent).toContain('Chargement')
        expect(refreshButton.querySelector('mat-spinner')).not.toBeNull()
        expect(
            refreshButton.querySelector('.refresh-button__content')
        ).not.toBeNull()
        expect(
            refreshButton.querySelector('.refresh-button__label')?.textContent
        ).toContain('Chargement')
        expect(refreshButton.disabled).toBe(true)
    })
})
