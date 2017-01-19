import { NgModule } from '@angular/core';
import { IonicApp, IonicModule } from 'ionic-angular';
import { MyApp } from './app.component';


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

import { PushDataToOsmPage } from '../pages/pushDataToOsm/pushDataToOsm';




import { KeysPipe } from '../pipes/keys.pipe';
import { FilterExcludeKeysPipe } from '../pipes/filterExcludeKeys.pipe';
import { FilterIncludeKeysPipe } from '../pipes/filterIncludeKeys.pipe';
import { FilterNullValuePipe } from '../pipes/filterNullValue.pipe';
import { ToLowercasePipe } from '../pipes/toLowercase.pipe';
import { FilterByContentPipe } from '../pipes/filterByContent.pipe';



@NgModule({
  declarations: [
    MyApp,
    SettingsPage,
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
    FilterByContentPipe
  ],
  imports: [
    IonicModule.forRoot(MyApp)
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
  providers: [ConfigService,OsmApiService,MapService,TagsService,DataService, RouterService, AlertService, LocationService]
})
export class AppModule { }
