import { NgModule } from '@angular/core';
import { BrowserModule, HammerGestureConfig, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import * as Hammer from 'hammerjs';
import { RouteReuseStrategy } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AngularResizedEventModule } from 'angular-resize-event';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';


import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { AboutPage } from './components/about/about';
import { LocationPage } from './components/location/location';
import { MainPage } from './components/main/main';
import { MenuPage } from './components/menu/menu';
import { ModalsContentPage } from './components/modal/modal';
import { ModalPrimaryTag } from './components/modal/modal.primaryTag/modal.primaryTag';


import { ModalSelectList } from './components/modal/modalSelectList/modalSelectList';
import { PushDataToOsmPage } from './components/pushDataToOsm/pushDataToOsm';
import { SettingsPage } from './components/settings/settings';

import { ReadMeta } from './components/modal/components/READ_Meta.component';
import { ReadPrimaryKey } from './components/modal/components/READ_PrimaryKey.component';
import { ReadOtherTag } from './components/modal/components/READ_OtherTag.component';
import { ReadPresets } from './components/modal/components/READ_Presets.component';

import { EditOtherTag } from './components/modal/components/EDIT_OtherTag.component';
import { EditPresets } from './components/modal/components/EDIT_Presets.component';
import { EditPrimaryKey } from './components/modal/components/EDIT_PrimaryKey.component';

import { DisplayPresetLabelPipe } from './pipes/displayPresetLabel.pipe';
import { FilterByContentPipe } from './pipes/filterByContent.pipe';
import { FilterDeprecatedTagPipe } from './pipes/filterDeprecatedTag.pipe';
import { FilterExcludeKeysPipe } from './pipes/filterExcludeKeys.pipe';
import { FilterIncludeKeysPipe } from './pipes/filterIncludeKeys.pipe';
import { FilterNullValuePipe } from './pipes/filterNullValue.pipe';
import { KeysPipe } from './pipes/keys.pipe';
import { ToLowercasePipe } from './pipes/toLowercase.pipe';



import { HttpClientModule, HttpClient } from '@angular/common/http';


import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { MomentModule } from 'ngx-moment';
import 'moment/locale/en-gb';
import 'moment/locale/fr';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';


export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export class CustomHammerConfig extends HammerGestureConfig{
  overrides = {
    'pan':{
      direction :Hammer.DIRECTION_ALL
    }
  }

}

@NgModule({
  declarations: [AppComponent, MainPage, LocationPage, AboutPage, MenuPage,
    ModalPrimaryTag, ModalsContentPage, ModalSelectList, PushDataToOsmPage, SettingsPage,
    ReadMeta, ReadPrimaryKey, ReadOtherTag, ReadPresets, EditOtherTag, EditPresets, EditPrimaryKey,

    DisplayPresetLabelPipe,
    FilterByContentPipe,
    FilterDeprecatedTagPipe,
    FilterExcludeKeysPipe,
    FilterIncludeKeysPipe, FilterNullValuePipe, KeysPipe, ToLowercasePipe,
  ],
  entryComponents: [ModalsContentPage, ModalPrimaryTag, ModalSelectList],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    IonicModule.forRoot(),
    IonicStorageModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
    MomentModule,
    AngularResizedEventModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (createTranslateLoader),
        deps: [HttpClient]
      }
    }),
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })
  ],

  providers: [

    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide : HAMMER_GESTURE_CONFIG, useClass: CustomHammerConfig}
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
