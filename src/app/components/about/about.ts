import { Component, inject } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatListModule } from '@angular/material/list'
import { ScreenHeaderComponent } from '@components/shared/screen-header/screen-header'
import { TranslateModule } from '@ngx-translate/core'
import { ConfigService } from '@services/config.service'
import { OverlayNavigationService } from '@services/overlay-navigation.service'

@Component({
    selector: 'page-about',
    templateUrl: './about.html',
    styleUrls: ['./about.scss'],
    imports: [
        MatIconModule,
        MatListModule,
        ScreenHeaderComponent,
        TranslateModule,
    ],
})
export class AboutPage {
    readonly configService = inject(ConfigService)
    private readonly overlayNavigation = inject(OverlayNavigationService)

    back(): void {
        void this.overlayNavigation.close()
    }
}
