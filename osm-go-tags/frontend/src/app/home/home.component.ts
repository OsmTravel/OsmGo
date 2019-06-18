import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { TagsService } from '../tags.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  i18Config = {
    "tags": [],
    "interface": []
    };

  selectedLanguageTag = undefined;

  constructor(public dataService :DataService,
              public tagsService : TagsService,
              private route: ActivatedRoute,
              private router: Router,
              
      ) { }

  ngOnInit() {
    this.dataService.getI18Config$()
      .subscribe( i18 => {
      
        this.i18Config = i18;
      })
  }

  languageChange(e){
    this.tagsService.language = e.value;
    this.tagsService.country = null;
    this.selectedLanguageTag = this.i18Config.tags.filter(o => o.language === e.value)[0];
  }

  countryChange(e){
    this.tagsService.country = e.value;
  }

  goToTranslateUi(){
    this.router.navigate(['/translateUi']);
  }

  goToTagsConfig(){
    this.router.navigate(['/tags']);
  }

}
