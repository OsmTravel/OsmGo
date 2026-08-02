import { CdkTrapFocus } from '@angular/cdk/a11y'
import { Component, inject, input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog } from '@angular/material/dialog'
import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'
import { OsmAuthService } from '@app/services/osm-auth.service'
import {
    ConfirmDialogComponent,
    type ConfirmDialogData,
} from '@components/shared/confirm-dialog/confirm-dialog'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { ConfigService } from '@services/config.service'
import { MapService } from '@services/map.service'
import { OverlayNavigationService } from '@services/overlay-navigation.service'
import { menuAnimations } from './menu.animations'

@Component({
    selector: 'menu-component',
    templateUrl: './menu.html',
    styleUrls: ['./menu.scss'],
    animations: menuAnimations,
    imports: [
        CdkTrapFocus,
        MatButtonModule,
        MatDividerModule,
        MatIconModule,
        TranslateModule,
    ],
})
export class MenuPage {
    readonly mapService = inject(MapService)
    readonly configService = inject(ConfigService)
    private readonly dialog = inject(MatDialog)
    private readonly translate = inject(TranslateService)
    private readonly overlayNavigation = inject(OverlayNavigationService)
    readonly osmAuthService = inject(OsmAuthService)

    private swipeStartX: number | null = null

    readonly closeEvent = output<void>()
    readonly exitApp = output<void>()
    readonly menuIsOpen = input(false)
    readonly newVersion = input(false)

    deleteDatapresentConfirm(): void {
        const data: ConfirmDialogData = {
            title: this.translate.instant('MENU.DELETE_DATA_CONFIRM_HEADER'),
            message: this.translate.instant('MENU.DELETE_DATA_CONFIRM_MESSAGE'),
            cancelLabel: this.translate.instant('SHARED.CANCEL'),
            confirmLabel: this.translate.instant('SHARED.CONFIRM'),
            destructive: true,
        }
        this.dialog
            .open(ConfirmDialogComponent, {
                data,
                autoFocus: 'dialog',
                maxWidth: 'calc(100vw - 32px)',
                panelClass: 'osmgo-dialog',
            })
            .afterClosed()
            .subscribe((confirmed) => {
                if (confirmed) {
                    this.mapService.resetDataMap()
                    this.closeMenu()
                }
            })
    }

    pushPage(path: string): void {
        this.closeMenu()
        void this.overlayNavigation.open(path)
    }

    openBaseMapsPage() {
        const centerOfMap = this.mapService.map.getCenter()
        const lng = centerOfMap.lng
        const lat = centerOfMap.lat
        this.pushPage(`/basemaps/${lng}/${lat}`)
    }

    closeMenu() {
        this.closeEvent.emit()
    }

    logout() {
        this.osmAuthService.logout()
        this.closeMenu()
    }

    login(): void {
        this.osmAuthService.login().subscribe({
            error: (error) => console.error('Unable to start login.', error),
        })
    }

    startSwipe(event: PointerEvent): void {
        this.swipeStartX = event.clientX
    }

    endSwipe(event: PointerEvent): void {
        if (
            this.swipeStartX !== null &&
            event.clientX - this.swipeStartX < -50
        ) {
            this.closeMenu()
        }
        this.swipeStartX = null
    }

    cancelSwipe(): void {
        this.swipeStartX = null
    }

    reloadApp() {
        window.location.reload()
    }

    exit() {
        this.exitApp.emit()
    }
}
