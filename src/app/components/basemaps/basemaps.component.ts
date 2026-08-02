import { Component, inject } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatRippleModule } from '@angular/material/core'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { ActivatedRoute } from '@angular/router'
import { ScreenHeaderComponent } from '@components/shared/screen-header/screen-header'
import { TranslateModule } from '@ngx-translate/core'
import { type Basemap, BasemapsService } from '@services/basemaps.service'
import { ConfigService } from '@services/config.service'
import { InitService } from '@services/init.service'
import { MapService } from '@services/map.service'
import { OverlayNavigationService } from '@services/overlay-navigation.service'
import { catchError, of, switchMap } from 'rxjs'

@Component({
    selector: 'app-basemaps',
    templateUrl: './basemaps.component.html',
    styleUrls: ['./basemaps.component.scss'],
    imports: [
        MatIconModule,
        MatProgressSpinnerModule,
        MatRippleModule,
        ScreenHeaderComponent,
        TranslateModule,
    ],
})
export class BasemapsComponent {
    private readonly overlayNavigation = inject(OverlayNavigationService)
    private readonly route = inject(ActivatedRoute)
    private readonly basemapsService = inject(BasemapsService)
    readonly initService = inject(InitService)
    readonly configService = inject(ConfigService)
    readonly mapService = inject(MapService)

    readonly basemaps = toSignal(
        this.route.params.pipe(
            switchMap((params) =>
                this.basemapsService.getBasemaps$(
                    Number.parseFloat(params.lng),
                    Number.parseFloat(params.lat)
                )
            ),
            catchError((error: unknown) => {
                console.error('Unable to load basemaps:', error)
                return of([])
            })
        ),
        { initialValue: [] }
    )

    back(): void {
        void this.overlayNavigation.close()
    }

    selectBaseMap(basemap: Basemap): void {
        this.configService.setBasemap(basemap)
        this.mapService.displaySatelliteBaseMap(basemap, true)
        this.back()
    }
}
