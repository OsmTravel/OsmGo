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
    this.fromLanguage = e.value;
    this.selectedFromLanguage = this.dataService.i18Config.tags.find( c => c.language == this.fromLanguage);
    this.fromCountry = this.selectedFromLanguage.country[0].region
  }

  countryFromChange(e){
  }

  createConfig(){
    this.dataService.addNewTagConfig$(this.newLanguage, this.newCountry, this.fromLanguage, this.fromCountry)
      .subscribe( d => {
        this.dataService.getI18Config$().subscribe()
      })
  }

}
