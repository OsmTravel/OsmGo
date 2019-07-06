import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})

export class TaginfoService {

  constructor(private http: HttpClient) { }

//   getCombinations(key, value, limit = 20) {
//     const url = `https://taginfo.openstreetmap.org/api/4/tag/combinations?
// key=${key}
// &value=${value}
// &rp=${limit}
// &sortname=together_count&sortorder=desc`;
//     return this.http.get(url);
//   }
  // shop jewelry, operator
}

// [out:json][timeout:25];
// (
//   // query part for: “shop=bakery”
//   node["shop"="bakery"]["pastry_shop"](42.42345651793833,-5.3173828125,50.91688748924508,8.063964843750002);
//   way["shop"="bakery"]["pastry_shop"](42.42345651793833,-5.3173828125,50.91688748924508,8.063964843750002);
// );
// // print results
// out tags;
// >;
