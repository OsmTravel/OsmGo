import { Component, inject, input, output } from '@angular/core'
import { MatBadgeModule } from '@angular/material/badge'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatTooltipModule } from '@angular/material/tooltip'
import { TranslateModule } from '@ngx-translate/core'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { LocationService } from '@services/location.service'
import { MapService } from '@services/map.service'
import { OverlayNavigationService } from '@services/overlay-navigation.service'

@Component({
    selector: 'app-map-controls',
    templateUrl: './map-controls.html',
    styleUrls: ['./map-controls.scss'],
    imports: [
        MatBadgeModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        TranslateModule,
    ],
})
export class MapControlsComponent {
    readonly configService = inject(ConfigService)
    readonly dataService = inject(DataService)
    readonly locationService = inject(LocationService)
    readonly mapService = inject(MapService)
    private readonly overlayNavigation = inject(OverlayNavigationService)

    readonly newVersion = input(false)
    readonly menuRequested = output<void>()
    readonly refreshRequested = output<void>()
    readonly addRequested = output<void>()

    openUpload(): void {
        void this.overlayNavigation.open('/pushData')
    }

    toggleBasemap(): void {
        this.mapService.displaySatelliteBaseMap(
            this.configService.getBasemap(),
            !this.mapService.isDisplaySatelliteBaseMap()
        )
    }
}
