import { Injectable, EventEmitter } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StatesService {

  eventBackButton = new EventEmitter();
  states = [];

  constructor() { }
}
