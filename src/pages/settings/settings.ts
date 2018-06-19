import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NavController, Platform, ViewController } from 'ionic-angular';
import { ConfigService } from '../../services/config.service'
import { MapService } from '../../services/map.service'
import { OsmApiService } from '../../services/osmApi.service';


@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class SettingsPage {


  constructor(public navCtrl: NavController,
    public configService: ConfigService,
    public mapService: MapService,
    public platform: Platform,
    public viewCtrl: ViewController,
    public osmApi: OsmApiService) {

    this.platform.registerBackButtonAction(e => {
      this.dismiss();
    });

  }

  dismiss(data = null) {
    this.viewCtrl.dismiss(data);
  }

  mapMarginBufferChange(e) {
    this.configService.setMapMarginBuffer(e.value);
  }

  lockMapHeadingChange(e) {
    this.configService.setLockMapHeading(e.checked);
  }

  followPositionChange(e) {
    this.configService.setFollowPosition(e.checked);
  }


  mapIsPichedChange(e) {
    this.configService.setMapIsPiched(e.checked);
    this.mapService.setPitch(e.checked);
  }

  defaultPrimarykeyWindowsChange(e) {
    this.configService.setDefaultPrimarykeyWindows(e);
  }

  delegateDataConversionChange(e) {
    this.configService.setDelegateDataConversion(e.checked);
  }

  isDelayedChange(e){
    this.configService.setIsDelayed(e.checked);
  }
}
