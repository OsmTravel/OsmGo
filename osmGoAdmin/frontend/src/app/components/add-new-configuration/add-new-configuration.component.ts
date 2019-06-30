import { Component, OnInit } from '@angular/core';
import { TagsService } from 'src/app/services/tags.service';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-add-new-configuration',
  templateUrl: './add-new-configuration.component.html',
  styleUrls: ['./add-new-configuration.component.css']
})
export class AddNewConfigurationComponent implements OnInit {

  newLanguage
  newCountry

  fromLanguage
  fromCountry

  selectedFromLanguage
  

  constructor( public dataService: DataService) { }

  ngOnInit() {
  }


  languageFromChange(e) {
    console.log(e.value)
    this.fromLanguage = e.value;
    console.log(this.dataService.i18Config.tags);
    this.selectedFromLanguage = this.dataService.i18Config.tags.find( c => c.language == this.fromLanguage);
    this.fromCountry = this.selectedFromLanguage.country[0].region
    console.log(this.selectedFromLanguage.country[0].region)

    // console.log(this.selectedFromLanguage)
    // this.tagsService.country = null;
    // this.selectedLanguageTag = this.dataService.i18Config.tags.filter(o => o.language === e.value)[0];
  }

  countryFromChange(e){
    console.log(e.value)
    // this.fromCountry = e.value;
  }

  createConfig(){
    this.dataService.addNewTagConfig$(this.newLanguage, this.newCountry, this.fromLanguage, this.fromCountry)
      .subscribe( d => {
        console.log(d);
        this.dataService.getI18Config$().subscribe()
      })
  }

}
