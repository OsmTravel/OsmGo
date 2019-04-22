import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { AboutPage } from './components/about/about';
import { LocationPage } from './components/location/location';
import { LoginPage } from './components/login/login';
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

import { AppVersion } from '@ionic-native/app-version/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { DeviceOrientation } from '@ionic-native/device-orientation/ngx';
import { Vibration } from '@ionic-native/vibration/ngx';

import { Diagnostic } from '@ionic-native/diagnostic/ngx';

import { HttpClientModule } from '@angular/common/http';
import { MomentModule } from 'ngx-moment';
import 'moment/locale/fr';

@NgModule({
  declarations: [AppComponent, MainPage, LocationPage, AboutPage, LoginPage, MenuPage,
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
    FormsModule,
    IonicModule.forRoot(),
    IonicStorageModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
    MomentModule
  ],

  providers: [
    AppVersion,
    Geolocation,
    DeviceOrientation,
    Diagnostic,
    StatusBar,
    SplashScreen,
    Vibration,

    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
