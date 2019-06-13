import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';


const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
  })
};

@Component({
  selector: 'app-translate-ui',
  templateUrl: './translate-ui.component.html',
  styleUrls: ['./translate-ui.component.scss']
})
export class TranslateUiComponent implements OnInit {

  translationData = []

  constructor(
    public dataService: DataService,
    private router: Router,
    private http : HttpClient
  ) { }

  ngOnInit() {
    if (!this.dataService.langageUiSelected) {
      //this.dataService.langageUiSelected = 'fr'
      this.router.navigate(['/']);
      return;
    }
    
    forkJoin(
      this.getLanguageData$('en'),
      this.getLanguageData$(this.dataService.langageUiSelected)
    ).subscribe( data => {
      const en = data[0]
      const otherLang = data[1]
      for( let category in en){
        for (let key in en[category]){
            this.translationData = [
              ...this.translationData, 
              {category , key , 'en': en[category][key], 'translation': otherLang[category][key] || null }
            ]
        }
      }
      // console.log(data);
    })


  }


  getLanguageData$(lang) {
    return this.http.get<any[]>(`api/UiTranslation/${lang}`)
    .pipe()
    ;
  }


  toI18Format(data){
    const i18Format ={};
    for (let item of data){
      if (item.translation && item.translation !=''){
        if (!i18Format[item.category]){
          i18Format[item.category] = {}
        }
        i18Format[item.category][item.key] = item.translation
      }
    }
    return i18Format
  }


  sendNewTranslation(data, lang){
    let  newTranslation = this.toI18Format(data);
    const params = { newTranslation: newTranslation};
    this.http.post<any>(`api/UiTranslation/${lang}`, params, httpOptions)
    .pipe(    ).subscribe( e => {
      alert('Thank you !')
      console.log(e)
    })

  }



}
