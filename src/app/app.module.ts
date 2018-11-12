import { NgModule,ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { HttpModule} from '@angular/http';
import { HttpClientModule } from '@angular/common/http';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TooltipsModule } from 'ionic-tooltips';
import { BrowserModule } from '@angular/platform-browser';

import { MyApp } from './app.component';
import { IonicStorageModule } from '@ionic/storage';

import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { Geolocation } from '@ionic-native/geolocation';
import { AppVersion } from '@ionic-native/app-version';
import { Diagnostic } from '@ionic-native/diagnostic';

import { Device } from '@ionic-native/device';


import { MapService } from '../services/map.service';
import { OsmApiService } from '../services/osmApi.service';
import { TagsService } from '../services/tags.service';
import { DataService } from '../services/data.service';
import { RouterService } from '../services/router.service';
import { AlertService } from '../services/alert.service';
import { LocationService } from '../services/location.service';
import { ConfigService } from '../services/config.service';

import { MainPage } from '../pages/main/main';
import { ModalsContentPage } from '../pages/modal/modal';
import { ModalPrimaryTag } from '../pages/modal/modal.primaryTag/modal.primaryTag';
import { ModalSelectList } from '../pages/modal/modalSelectList/modalSelectList';

import { ReadPrimaryKey } from '../pages/modal/components/READ_PrimaryKey.component';
import { EditPrimaryKey } from '../pages/modal/components/EDIT_PrimaryKey.component';
import { ReadPresets } from '../pages/modal/components/READ_Presets.component';
import { EditPresets } from '../pages/modal/components/EDIT_Presets.component';
import { ReadOtherTag } from '../pages/modal/components/READ_OtherTag.component';
import { EditOtherTag } from '../pages/modal/components/EDIT_OtherTag.component'
import { ReadMeta } from '../pages/modal/components/READ_Meta.component';


import { MenuPage } from '../pages/menu/menu';
import { AboutPage } from '../pages/about/about';
import { LoginPage } from '../pages/login/login';
import { SettingsPage } from '../pages/settings/settings';
import { LocationPage } from '../pages/location/location';

import { PushDataToOsmPage } from '../pages/pushDataToOsm/pushDataToOsm';




import { KeysPipe } from '../pipes/keys.pipe';
import { FilterExcludeKeysPipe } from '../pipes/filterExcludeKeys.pipe';
import { FilterIncludeKeysPipe } from '../pipes/filterIncludeKeys.pipe';
import { FilterNullValuePipe } from '../pipes/filterNullValue.pipe';
import { ToLowercasePipe } from '../pipes/toLowercase.pipe';
import { FilterByContentPipe } from '../pipes/filterByContent.pipe';
import { FilterDeprecatedTagPipe } from '../pipes/filterDeprecatedTag.pipe';
import { DisplayPresetLabelPipe } from '../pipes/displayPresetLabel.pipe';




@NgModule({
  declarations: [
    MyApp,
    SettingsPage,
    LocationPage,
    MainPage,
    ModalsContentPage,
    ModalPrimaryTag,
    ModalSelectList,
    MenuPage,
    AboutPage,
    PushDataToOsmPage,
    LoginPage,
    
    ReadPrimaryKey,
    ReadPresets,
    ReadOtherTag,
    ReadMeta,
    EditPrimaryKey,
    EditPresets,
    EditOtherTag,

    KeysPipe,
    FilterExcludeKeysPipe,
    FilterIncludeKeysPipe,
    FilterNullValuePipe,
    ToLowercasePipe,
    FilterByContentPipe,
    FilterDeprecatedTagPipe,
    DisplayPresetLabelPipe
  ],
  imports: [
      HttpModule,
      HttpClientModule,
      BrowserAnimationsModule,
      TooltipsModule,
      BrowserModule,
      IonicModule.forRoot(MyApp),
     IonicStorageModule.forRoot()
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    MainPage,
    SettingsPage,
    ModalsContentPage,
    ModalPrimaryTag,
    ModalSelectList,
    MenuPage,
    AboutPage,
    PushDataToOsmPage,
    LoginPage
    
  ],
  providers: [ConfigService,OsmApiService,MapService,TagsService,DataService, 
  RouterService, AlertService, LocationService,
   SplashScreen, StatusBar, Geolocation, Diagnostic, AppVersion, Device,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule { }
