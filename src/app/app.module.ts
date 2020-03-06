import { NgModule } from '@angular/core';
import { BrowserModule,HammerModule} from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { RouteReuseStrategy } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AngularResizedEventModule } from 'angular-resize-event';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';


import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { AboutPage } from './components/about/about';
import { MainPage } from './components/main/main';
import { MenuPage } from './components/menu/menu';
import { LoginPage } from './components/login/login.component';

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
import { AlertComponent } from './components/modal/components/alert/alert.component';
import { IconComponent } from './components/icon/icon.component'

import { DisplayPresetLabelPipe } from './pipes/displayPresetLabel.pipe';

import { FilterByTagsContentPipe } from './pipes/filterByTagsContent.pipe';
import { FilterExcludeTagByCountryCode } from './pipes/filterExcludeTagByCountryCode.pipe';
import { FilterByCountryCode } from './pipes/filterByCountryCode.pipe';

import { FilterByPresetsContentPipe } from './pipes/filterByPresetsContent.pipe';

import { FilterDeprecatedTagPipe } from './pipes/filterDeprecatedTag.pipe';
import { FilterExcludeKeysPipe } from './pipes/filterExcludeKeys.pipe';






import { HttpClientModule, HttpClient } from '@angular/common/http';


import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { MomentModule } from 'ngx-moment';
import 'moment/locale/en-gb';
import 'moment/locale/fr';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { DisplayTagsPipe } from './pipes/display-tags.pipe';
import { FilterByByGeometryTypePipe } from './pipes/filter-by-geometry-type.pipe';
import { DialogMultiFeaturesComponent } from './components/dialog-multi-features/dialog-multi-features.component';
import { IsBookmarkedPipe } from './pipes/is-bookmarked.pipe';
import { FilterBySearchablePipe } from './pipes/filter-by-searchable.pipe';
import { HiddenTagsComponent } from './components/manage-tags/hidden-tags/hidden-tags.component';
import { TagListElementComponent } from './components/tag-list-element/tag-list-element.component';

import { ManageTagsComponent } from './components/manage-tags/manage-tags.component';
import { ActiveTagsComponent } from './components/manage-tags/active-tags/active-tags.component';
import { BookmarkedTagsComponent } from './components/manage-tags/bookmarked-tags/bookmarked-tags.component';

import { FiltersTagsByIdsPipe } from './pipes/filters-tags-by-ids.pipe';
import { SelectComponent } from './components/modal/components/select/select.component';
import { SortArrayPipe } from './pipes/sort-array.pipe';
import { LimitDisplayTagsPipe } from './pipes/limit-display-tags.pipe';


export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [AppComponent, MainPage, AboutPage, MenuPage, LoginPage,
    HiddenTagsComponent, ActiveTagsComponent,BookmarkedTagsComponent,  ManageTagsComponent,
    TagListElementComponent,
    ModalPrimaryTag, ModalsContentPage, ModalSelectList, PushDataToOsmPage, SettingsPage,DialogMultiFeaturesComponent,
    ReadMeta, ReadPrimaryKey, ReadOtherTag, ReadPresets, EditOtherTag, EditPresets, EditPrimaryKey, AlertComponent, 
    IconComponent, SelectComponent,

    DisplayPresetLabelPipe,
 
    FilterByTagsContentPipe,
    FilterExcludeTagByCountryCode,
    FilterByCountryCode,
    FilterByPresetsContentPipe,
    FilterDeprecatedTagPipe,
    FilterExcludeKeysPipe,
    DisplayTagsPipe, FilterByByGeometryTypePipe, IsBookmarkedPipe,
    FilterBySearchablePipe, FiltersTagsByIdsPipe, SortArrayPipe, LimitDisplayTagsPipe,
  ],
  entryComponents: [ModalsContentPage, ModalPrimaryTag, ModalSelectList, DialogMultiFeaturesComponent, HiddenTagsComponent, ActiveTagsComponent, BookmarkedTagsComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    IonicModule.forRoot({mode: 'md'}),
    IonicStorageModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
    MomentModule,
    HammerModule,
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

  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
