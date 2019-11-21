import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { OsmApiService } from '../../services/osmApi.service';
import { ConfigService } from 'src/app/services/config.service';


@Component({
    selector: 'login',
    templateUrl: './login.component.html'
})
export class LoginPage {
    username: string;
    password: string;
    errorLogin;

    constructor(public osmApi: OsmApiService, public navCtrl: NavController, public configService: ConfigService) {
       
    }

    login() {
        this.osmApi.getUserDetail$(this.username, this.password, true)
        .subscribe(res => {
            this.navCtrl.pop();
        }, (error => {
            console.log(error);
            this.errorLogin = error;
        })
        );
    }
}
