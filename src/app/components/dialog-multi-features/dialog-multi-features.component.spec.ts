import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core'
import { createTranslateLoader } from '../../app.module'

import { DialogMultiFeaturesComponent } from './dialog-multi-features.component';
import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';
import {HttpClient} from "@angular/common/http";
import { NavParams, ModalController } from '@ionic/angular';


export class NavParamsMock {
  static returnParam = null;
  public get(key): any {
    if (NavParamsMock.returnParam) {
       return NavParamsMock.returnParam
    }
    return 'default';
  }
  static setParams(value){
    NavParamsMock.returnParam = value;
  }
}

export class ModalControllerMock {
  public create(param1,param2) {
      let rtn: Object = {};
      rtn['present'] = (() => true);
      return rtn;
  }; };


describe('DialogMultiFeaturesComponent', () => {
  let translate: TranslateService;
  let http: HttpTestingController;
  let component: DialogMultiFeaturesComponent;
  let fixture: ComponentFixture<DialogMultiFeaturesComponent>;

  beforeEach(async(() => {
    NavParamsMock.setParams(null); //set your own params here
    TestBed.configureTestingModule({

      imports:[
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient]
          }
        })
      ],
      providers: [
        {provide: NavParams, useClass: NavParamsMock},
        {provide: ModalController, useClass: ModalControllerMock},
      ],

      declarations: [ DialogMultiFeaturesComponent ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogMultiFeaturesComponent);
    component = fixture.componentInstance;
    component.features = [];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
