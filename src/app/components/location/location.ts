import { Component, AfterViewInit } from '@angular/core';
// import { NavController, NavParams } from '@ionic/angular';
import { LocationService } from '../../services/location.service';
import { ConfigService } from '../../services/config.service';
import { MapService } from '../../services/map.service';
import { Observable , timer} from 'rxjs';


@Component({
  selector: 'page-location',
  templateUrl: './location.html',
})
export class LocationPage implements AfterViewInit {
  displayDontUseLocationButton = false;

  constructor(
    // public navCtrl: NavController,
    // public navParams: NavParams,
    public locationService: LocationService,
    public configService: ConfigService,
    public mapService: MapService) {
  }


  ngAfterViewInit() {
    const that = this;
    // On attend 6 secondes et on propose à l'utilisateur de bypasser la geoloc...
    timer(6000).subscribe(e => {
      that.displayDontUseLocationButton = true;
    });
  }

}
