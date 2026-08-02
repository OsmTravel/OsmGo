import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    NgZone,
    output,
} from '@angular/core'
import { OsmAuthService } from '@app/services/osm-auth.service'
import {
    AlertController,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonList,
    IonTitle,
    IonToolbar,
    NavController,
    Platform,
} from '@ionic/angular/standalone'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { AlertService } from '@services/alert.service'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { MapService } from '@services/map.service'
import { OsmApiService } from '@services/osmApi.service'
import { concat } from 'rxjs'
import { menuAnimations } from './menu.animations'

@Component({
    selector: 'menu-component',
    templateUrl: './menu.html',
    styleUrls: ['./menu.scss'],
    animations: menuAnimations,
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        IonButton,
        IonButtons,
        IonContent,
        IonHeader,
        IonIcon,
        IonItem,
        IonList,
        IonTitle,
        IonToolbar,
        TranslateModule,
    ],
})
export class MenuPage {
    readonly mapService = inject(MapService)
    readonly osmApi = inject(OsmApiService)
    readonly dataService = inject(DataService)
    readonly configService = inject(ConfigService)
    readonly alertService = inject(AlertService)
    private readonly alertCtrl = inject(AlertController)
    readonly platform = inject(Platform)
    private readonly translate = inject(TranslateService)
    private readonly navCtrl = inject(NavController)
    private readonly osmAuthService = inject(OsmAuthService)

    private swipeStartX: number | null = null

    readonly closeEvent = output<void>()
    readonly exitApp = output<void>()
    readonly menuIsOpen = input(false)
    readonly newVersion = input(false)

    deleteDatapresentConfirm() {
        this.alertCtrl
            .create({
                header: this.translate.instant(
                    'MENU.DELETE_DATA_CONFIRM_HEADER'
                ),
                message: this.translate.instant(
                    'MENU.DELETE_DATA_CONFIRM_MESSAGE'
                ),
                buttons: [
                    {
                        text: this.translate.instant('SHARED.CANCEL'),
                        role: 'cancel',
                        handler: () => {},
                    },
                    {
                        text: this.translate.instant('SHARED.CONFIRM'),
                        handler: () => {
                            this.mapService.resetDataMap()
                            this.closeMenu()
                        },
                    },
                ],
            })
            .then((alert) => {
                alert.present()
            })
    }

    pushPage(path) {
        this.navCtrl.navigateForward(path)
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
