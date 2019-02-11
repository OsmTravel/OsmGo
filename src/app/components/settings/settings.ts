import { Component } from '@angular/core';
import { NavController, Platform } from '@ionic/angular';
import { ConfigService } from '../../services/config.service';
import { MapService } from '../../services/map.service';
import { OsmApiService } from '../../services/osmApi.service';


@Component({
  selector: 'page-settings',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class SettingsPage {


  constructor(public navCtrl: NavController,
    public configService: ConfigService,
    public mapService: MapService,
    public platform: Platform,

    public osmApi: OsmApiService) {

  }

  back() {
   this.navCtrl.back();
  }

  mapMarginBufferChange(e) {

    this.configService.setMapMarginBuffer(e.detail.value);
  }

  lockMapHeadingChange(e) {
    this.configService.setLockMapHeading(e.detail.checked);
  }

  followPositionChange(e) {
    this.configService.setFollowPosition(e.detail.checked);
  }

  defaultPrimarykeyWindowsChange(e) {
    this.configService.setDefaultPrimarykeyWindows(e.detail.value);
  }

  isDelayedChange(e) {
    this.configService.setIsDelayed(e.detail.checked);
  }

  filterWayByArea(e) {
    this.configService.setFilterWayByArea(e.detail.checked);
    // value en m²!
    this.mapService.toogleMesureFilter(this.configService.getFilterWayByArea(), 'way_fill', 5000, this.mapService.map);

  }

  filterWayByLength(e) {
    this.configService.setFilterWayByLength(e.detail.checked);
    // value en km!
    this.mapService.toogleMesureFilter(this.configService.getFilterWayByLength(), 'way_line', 0.2, this.mapService.map);
  }

  baseMapChange(e) {
    this.configService.setBaseSourceId(e.detail.value);
    this.mapService.displaySatelliteBaseMap(this.configService.config.baseMapSourceId, false);
  }
}
