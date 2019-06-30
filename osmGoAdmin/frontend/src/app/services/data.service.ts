import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import * as osmAuth from '../../assets/osmauth.js';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  langageUiSelected;
  auth;
  user;
  jwt;
  i18Config = {
    "tags": [],
    "interface": []
  }
  tokens = { 
            oauth_consumer_key: 'v2oE6nAar9KvIWLZHs4ip5oB7GFzbp6wTfznPNkr',
            oauth_secret:'1M71flXI86rh4JC3koIlAxn1KSzGksusvA8TgDz7'
          };

  constructor(private http: HttpClient) { 

    this.auth = osmAuth({
      oauth_secret: this.tokens.oauth_secret,
      oauth_consumer_key: this.tokens.oauth_consumer_key,
      landing: `${window.location.href.split('#')[0]}/assets/land.html`
    })

  }

  getHttpOption(){
    // console.log('jwt', this.jwt)
    if (!this.jwt){
      this.jwt = localStorage.getItem('jwt_access_token')
    }
    const headers = new HttpHeaders()
    .set("Content-Type", 'application/json')
    .set("Authorization", "Bearer " + this.jwt)
    return {headers};
  }

  getI18Config$() {
    return this.http.get<any>(`./api/i18/`)
    .pipe(
      map( i18 => {
        console.log(i18)
        this.i18Config = i18;
      }

      )
    );
  }

  addNewUiLanguage$(newLanguage){
    let params = new HttpParams()
      .set('lg', newLanguage);
      const headers = this.getHttpOption()
      console.log(headers);
      console.log(params);
    return this.http.get<any>(`./api/addNewUILanguage`, {...headers ,params });
  }

  addNewTagConfig$(language, country, fromLanguage='en',fromCountry='GB' ){
    let params = new HttpParams()
    .set('language', language)
    .set('country', country)
    .set('fromLanguage', fromLanguage || 'en')
    .set('fromCountry', fromCountry || 'GB');
    const headers = this.getHttpOption()

    return this.http.get<any>(`./api/addNewConfiguration`, {...headers ,params });
  }

  getTokensFromLocalStorage(){
    this.tokens['secret'] = localStorage.getItem('https://www.openstreetmap.orgoauth_token_secret');
    this.tokens['request_token_secret'] = localStorage.getItem('https://www.openstreetmap.orgoauth_request_token_secret');
    this.tokens['auth_token'] = localStorage.getItem('https://www.openstreetmap.orgoauth_token');
    console.log(this.tokens);
    return this.tokens;

  }


  loginOsm$() {
    return from( 
      new Promise((resolve, reject) => {
      this.auth.authenticate((err, cb) => {
        if (err){
          console.log(err);
          reject(err);
        } else {
          localStorage.removeItem('https://www.openstreetmap.orgoauth_token_secret');
          localStorage.removeItem('https://www.openstreetmap.orgoauth_request_token_secret');
          localStorage.removeItem('https://www.openstreetmap.orgoauth_token');
          console.log(cb)
          console.log('loginOk');
         
          resolve(cb)
        }
      })
    }))
  }


  getJwtToken$(oauth_token, oauth_token_secret){
    let params = new HttpParams()
      .set('token', oauth_token )
      .set('token_secret', oauth_token_secret)
    
    return this.http.get<any>(`./api/auth`, { params: params })
          .pipe(
            map(user => {
              localStorage.setItem('jwt_access_token',user.jwt);
              return user.jwt
            })
          );
  }

  getUserDetail$(){

    const secret = localStorage.getItem('https://www.openstreetmap.orgoauth_token_secret');
    const request_token_secret = localStorage.getItem('https://www.openstreetmap.orgoauth_request_token_secret');
    const auth_token = localStorage.getItem('https://www.openstreetmap.orgoauth_token');
  

   
    return  from(    
      new Promise ( (resolve, reject) => {
      this.auth.xhr({
        method: 'GET',
        path: './api/0.6/user/details'
      }, ((err, data) => {
        if (err){
          reject(err)
        } else {
          const u = data.getElementsByTagName('user')[0];
          var changesets = data.getElementsByTagName('changesets')[0];
          const user = {
            display_name: u.getAttribute('display_name'),
            id: u.getAttribute('id'),
            count: changesets.getAttribute('count'),
            changesets: changesets
          };
          resolve(user);
        }

      }));

    })).pipe(
      map( user => {
        this.user = user;
        return user
      })
    )
    


  }

}
// 