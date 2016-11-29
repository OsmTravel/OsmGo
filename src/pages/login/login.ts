import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { OsmApiService } from '../../services/osmApi.service';


@Component({
    selector: 'login',
    templateUrl: './login.html'
})
export class LoginPage {
     username: string;
     password: string;
     errorLogin;

     constructor(public osmApi: OsmApiService, public navCtrl: NavController) {
         this.username = this.osmApi.user_info.user;
     }

     login() {
        this.osmApi.getUserDetail(this.username, this.password).subscribe(res=>{
                //this.navCtrl.setRoot(MainPage);
                this.navCtrl.pop();
         },(error =>{
             console.log(error);
             this.errorLogin = error;
         })
         )
     }
}
