import { Component, OnInit } from '@angular/core';
import { DataService } from '../../services/data.service';


@Component({
  selector: 'app-add-ui-language',
  templateUrl: './add-ui-language.component.html',
  styleUrls: ['./add-ui-language.component.css']
})
export class AddUiLanguageComponent implements OnInit {

  constructor( public dataService: DataService) { }
  newLanguage

  ngOnInit() {
  }

  addLanguage(newLanguage){
    this.dataService.addNewUiLanguage$(newLanguage)
      .subscribe( l => {
       
      } )
  }

}
