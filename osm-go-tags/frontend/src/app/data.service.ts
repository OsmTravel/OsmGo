import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';


@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) { }

  getI18Config$() {
    return this.http.get<any>(`/api/i18/`);
  }

}
// 