import { Component, OnInit, ɵConsole } from '@angular/core';
import { DataService } from '../../services/data.service';
import { TagsService } from '../../services/tags.service';
import { ActivatedRoute, Router } from '@angular/router';
import * as jwtDecode from 'jwt-decode';
import { MatDialog } from '@angular/material';
import { AddUiLanguageComponent } from '../add-ui-language/add-ui-language.component';
import { AddNewConfigurationComponent } from '../add-new-configuration/add-new-configuration.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  

  selectedLanguageTag = undefined;
 


  constructor(public dataService: DataService,
    public tagsService: TagsService,
    private route: ActivatedRoute,
    private router: Router,
    public dialog: MatDialog,


  ) {
    console.log(this.route.queryParams);
  }

  ngOnInit() {


    this.login()


    this.dataService.getI18Config$()
      .subscribe()
  }

  languageChange(e) {
    this.tagsService.language = e.value;
    this.tagsService.country = null;
    this.selectedLanguageTag = this.dataService.i18Config.tags.filter(o => o.language === e.value)[0];
  }

  countryChange(e) {
    this.tagsService.country = e.value;
  }

  goToTranslateUi() {
    this.router.navigate(['/translateUi']);
  }

  goToTagsConfig() {
    this.router.navigate(['/tags']);
  }



  logout() {
    localStorage.removeItem('jwt_access_token');
    this.dataService.user = null;
    localStorage.removeItem('https://www.openstreetmap.orgoauth_token_secret');
    localStorage.removeItem('https://www.openstreetmap.orgoauth_request_token_secret');
    localStorage.removeItem('https://www.openstreetmap.orgoauth_token');
  }



  login(){
    // verification du token jwt
    const jwt = localStorage.getItem('jwt_access_token');
    if (jwt){
      this.dataService.jwt = jwt;
      const decoded = jwtDecode(jwt);
      this.dataService.user = {...decoded};
    }
    else {
      this.dataService.loginOsm$().subscribe( e => {
        console.log(e);
        const oauth_token = e['oauth_token']
        const oauth_token_secret =e['oauth_token_secret']
        this.dataService.getJwtToken$(oauth_token, oauth_token_secret ).subscribe( jwt => {
          this.dataService.jwt = jwt;
          var decoded = jwtDecode(jwt);
          this.dataService.user = {...decoded};
        })
      })

    }
  }

  openAddLanguageUI(): void {
    const dialogRef = this.dialog.open(AddUiLanguageComponent, {
      height: '80%',
      width: '80%'
    });

    dialogRef.afterClosed().subscribe(result => {
      this.dataService.getI18Config$()
      .subscribe()
    });
  }

  openAddNewConfig(): void {
    const dialogRef = this.dialog.open(AddNewConfigurationComponent, {
      height: '80%',
      width: '80%'
    });

    dialogRef.afterClosed().subscribe(result => {
      this.dataService.getI18Config$()
      .subscribe()
    });
  }

  
}
