import { Component, inject, OnInit } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute } from '@angular/router'
import {
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    NavController,
} from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import { type Basemap, BasemapsService } from '@services/basemaps.service'
import { ConfigService } from '@services/config.service'
import { InitService } from '@services/init.service'
import { MapService } from '@services/map.service'
import { catchError, of, switchMap } from 'rxjs'

@Component({
    selector: 'app-basemaps',
    templateUrl: './basemaps.component.html',
    styleUrls: ['./basemaps.component.scss'],
    imports: [
        IonButton,
        IonButtons,
        IonCard,
        IonCardContent,
        IonCardHeader,
        IonCardSubtitle,
        IonCardTitle,
        IonContent,
        IonHeader,
        IonIcon,
        IonTitle,
        IonToolbar,
        TranslateModule,
    ],
})
export class BasemapsComponent implements OnInit {
    readonly navCtrl = inject(NavController)
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

    ngOnInit() {
        if (!this.initService.isLoaded) {
            // We need to instantiate the map
            this.navCtrl.back()
        }
    }

    selectBaseMap(basemap: Basemap): void {
        this.configService.setBasemap(basemap)
        this.mapService.displaySatelliteBaseMap(basemap, true)
        this.navCtrl.back()
    }
}
