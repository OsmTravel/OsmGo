import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { NavController } from '@ionic/angular'
import { BasemapsService } from '@services/basemaps.service'
import { ConfigService } from '@services/config.service'
import { InitService } from '@services/init.service'
import { MapService } from '@services/map.service'

@Component({
    selector: 'app-basemaps',
    templateUrl: './basemaps.component.html',
    styleUrls: ['./basemaps.component.scss'],
})
export class BasemapsComponent implements OnInit {
    lat: number
    lng: number
    basemaps: Record<string, any>[]

    constructor(
        public navCtrl: NavController,
        private route: ActivatedRoute,
        private basemapsService: BasemapsService,
        public initService: InitService,
        public configService: ConfigService,
        public mapService: MapService
    ) {}

    ngOnInit() {
        if (!this.initService.isLoaded) {
            // We need to instantiate the map
            this.navCtrl.back()
        }

        if (this.route.params) {
            this.route.params.subscribe({
                next: (params) => {
                    this.lng = parseFloat(params.lng)
                    this.lat = parseFloat(params.lat)

                    this.basemapsService
                        .getBasemaps$(this.lng, this.lat)
                        .subscribe((basemaps) => {
                            this.basemaps = basemaps
                        })
                },
                error: (err) => {
                    console.error('Error: ', err)
                },
            })
        }
    }

    selectBaseMap(basemap: Record<string, any>) {
        this.configService.setBasemap(basemap)
        this.mapService.displaySatelliteBaseMap(basemap, true)
        this.navCtrl.back()
    }
}
