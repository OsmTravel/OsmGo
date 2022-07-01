import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { NavController } from '@ionic/angular'
import { BasemapsService } from 'src/app/services/basemaps.service'
import { ConfigService } from 'src/app/services/config.service'
import { InitService } from 'src/app/services/init.service'
import { MapService } from 'src/app/services/map.service'

@Component({
    selector: 'app-basemaps',
    templateUrl: './basemaps.component.html',
    styleUrls: ['./basemaps.component.scss'],
})
export class BasemapsComponent implements OnInit {
    lat: number
    lng: number
    basemaps: any[]

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

        this.route.params.subscribe((params) => {
            this.lng = parseFloat(params.lng)
            this.lat = parseFloat(params.lat)

            this.basemapsService
                .getBasemaps$(this.lng, this.lat)
                .subscribe((basemaps) => {
                    this.basemaps = basemaps
                })
        })
    }

    selectBaseMap(basemap) {
        this.configService.setBasemap(basemap)
        this.mapService.displaySatelliteBaseMap(basemap, true)
        this.navCtrl.back()
    }
}
