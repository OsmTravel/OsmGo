import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { LocationService } from '../../services/location.service';
import { ConfigService } from '../../services/config.service';
import { MapService } from '../../services/map.service';
import { Observable } from 'rxjs/Observable';


@Component({
  selector: 'page-location',
  templateUrl: 'location.html',
})
export class LocationPage {
  displayDontUseLocationButton = false;

  constructor(public navCtrl: NavController,
    public navParams: NavParams,
    public locationService: LocationService,
    public configService: ConfigService,
    public mapService: MapService) {
  }


  ngAfterViewInit() {
    const that = this;
    // On attend 6 secondes et on propose à l'utilisateur de bypasser la geoloc...
    Observable.timer(6000).subscribe( e => {
      that.displayDontUseLocationButton = true;
    })
  }

}
