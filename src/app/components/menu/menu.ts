import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    NgZone,
    Output,
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
    private swipeStartX: number | null = null

    @Output() closeEvent = new EventEmitter()
    @Output() exitApp = new EventEmitter()
    @Input() menuIsOpen
    @Input() newVersion
    constructor(
        public mapService: MapService,
        public osmApi: OsmApiService,
        public dataService: DataService,
        public configService: ConfigService,
        public alertService: AlertService,
        private alertCtrl: AlertController,
        public platform: Platform,
        private translate: TranslateService,
        private navCtrl: NavController,
        private osmAuthService: OsmAuthService
    ) {}

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
