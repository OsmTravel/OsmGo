import { NgModule } from '@angular/core'
import { BrowserModule, HammerModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'

import { RouteReuseStrategy } from '@angular/router'
import { FormsModule } from '@angular/forms'

import { IonicModule, IonicRouteStrategy } from '@ionic/angular'
import { IonicStorageModule } from '@ionic/storage-angular'

import { AppComponent } from '@app/app.component'
import { AppRoutingModule } from '@app/app-routing.module'

import { AboutPage } from '@components/about/about'
import { MainPage } from '@components/main/main'
import { MenuPage } from '@components/menu/menu'
import { LoginPage } from '@components/login/login.component'

import { ModalsContentPage } from '@components/modal/modal'
import { ModalPrimaryTag } from '@components/modal/modal.primaryTag/modal.primaryTag'
import { OpeningHoursComponent } from '@components/modal/components/opening-hours/opening-hours.component'

import { ModalSelectList } from '@components/modal/modalSelectList/modalSelectList'
import { ModalAddTag } from '@components/modal/modal.addTag/modal.addTag'
import { PushDataToOsmPage } from '@components/pushDataToOsm/pushDataToOsm'
import { SettingsPage } from '@components/settings/settings'

import { MetaCard } from '@app/components/modal/components/meta-card/MetaCard'
import { SurveyCard } from '@components/modal/components/survey-card/SurveyCard'
import { PrimaryKey } from '@components/modal/components/primary-key/PrimaryKey'

import { ReadOtherTag } from '@components/modal/components/read/OtherTag.component'
import { ReadPresets } from '@components/modal/components/read/Presets.component'

import { EditOtherTag } from '@components/modal/components/edit/OtherTag.component'
import { EditPresets } from '@components/modal/components/edit/Presets.component'

import { AlertComponent } from '@components/modal/components/alert/alert.component'
import { IconComponent } from '@components/icon/icon.component'

import { DisplayPresetLabelPipe } from '@pipes/displayPresetLabel.pipe'

import { FilterByTagsContentPipe } from '@pipes/filterByTagsContent.pipe'
import { FilterExcludeTagByCountryCode } from '@pipes/filterExcludeTagByCountryCode.pipe'
import { FilterByCountryCode } from '@pipes/filterByCountryCode.pipe'

import { FilterByPresetsContentPipe } from '@pipes/filterByPresetsContent.pipe'

import { FilterByListPipe } from '@pipes/filterByList.pipe'
import { FilterPresetsByListPipe } from '@pipes/filterPresetsByList.pipe'
import { RemoveBrandsPipe } from '@pipes/removeBrands.pipe'
import { SearchForPipe } from '@pipes/searchFor.pipe'
import { ToOsmTagPipe } from '@pipes/toOsmTag.pipe'

import { FilterDeprecatedTagPipe } from '@pipes/filterDeprecatedTag.pipe'
import { FilterExcludeKeysPipe } from '@pipes/filterExcludeKeys.pipe'
import { OrderByPresetPipe } from '@pipes/orderByPreset.pipe'
import { CharLimitPipe } from '@pipes/charLimit.pipe'

import { HttpClientModule, HttpClient } from '@angular/common/http'

import { TranslateModule, TranslateLoader } from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'

import { MomentModule } from 'ngx-moment'
import 'moment/locale/en-gb'
import 'moment/locale/fr'
import { ServiceWorkerModule } from '@angular/service-worker'
import { environment } from '@environments/environment'
import { DisplayTagsPipe } from '@pipes/display-tags.pipe'
import { FilterByByGeometryTypePipe } from '@pipes/filter-by-geometry-type.pipe'
import { DialogMultiFeaturesComponent } from '@components/dialog-multi-features/dialog-multi-features.component'
import { IsBookmarkedPipe } from '@pipes/is-bookmarked.pipe'
import { FilterBySearchablePipe } from '@pipes/filter-by-searchable.pipe'
import { HiddenTagsComponent } from '@components/manage-tags/hidden-tags/hidden-tags.component'
import { TagListElementComponent } from '@components/tag-list-element/tag-list-element.component'

import { ManageTagsComponent } from '@components/manage-tags/manage-tags.component'
import { ActiveTagsComponent } from '@components/manage-tags/active-tags/active-tags.component'
import { BookmarkedTagsComponent } from '@components/manage-tags/bookmarked-tags/bookmarked-tags.component'

import { FiltersTagsByIdsPipe } from '@pipes/filters-tags-by-ids.pipe'
import { SelectComponent } from '@components/modal/components/select/select.component'
import { SortArrayPipe } from '@pipes/sort-array.pipe'
import { LimitDisplayTagsPipe } from '@pipes/limit-display-tags.pipe'
import { from } from 'rxjs'
import { MinutesToHoursMinutesPipe } from '@pipes/minutes-to-hours-minutes.pipe'
import { ModalAddOpeningHoursIntervalComponent } from '@components/modal/components/opening-hours/modal-add-opening-hours-interval/modal-add-opening-hours-interval.component'
import { BasemapsComponent } from '@components/basemaps/basemaps.component'

export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json')
}

@NgModule({
    declarations: [
        AppComponent,
        MainPage,
        AboutPage,
        MenuPage,
        LoginPage,
        HiddenTagsComponent,
        ActiveTagsComponent,
        BookmarkedTagsComponent,
        ManageTagsComponent,
        TagListElementComponent,
        ModalPrimaryTag,
        ModalsContentPage,
        ModalSelectList,
        ModalAddTag,
        PushDataToOsmPage,
        SettingsPage,
        DialogMultiFeaturesComponent,
        ReadOtherTag,
        ReadPresets,
        EditOtherTag,
        EditPresets,
        AlertComponent,
        IconComponent,
        SelectComponent,
        ModalAddOpeningHoursIntervalComponent,

        MetaCard,
        SurveyCard,
        PrimaryKey,

        DisplayPresetLabelPipe,
        OpeningHoursComponent,
        FilterByTagsContentPipe,
        FilterExcludeTagByCountryCode,
        FilterByCountryCode,
        FilterByPresetsContentPipe,
        FilterDeprecatedTagPipe,
        FilterExcludeKeysPipe,

        FilterByListPipe,
        FilterPresetsByListPipe,
        RemoveBrandsPipe,
        SearchForPipe,
        ToOsmTagPipe,

        OrderByPresetPipe,
        CharLimitPipe,
        DisplayTagsPipe,
        FilterByByGeometryTypePipe,
        IsBookmarkedPipe,
        FilterBySearchablePipe,
        FiltersTagsByIdsPipe,
        SortArrayPipe,
        LimitDisplayTagsPipe,
        MinutesToHoursMinutesPipe,
        BasemapsComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        IonicModule.forRoot({ mode: 'md' }),
        IonicStorageModule.forRoot(),
        AppRoutingModule,
        HttpClientModule,
        MomentModule,
        HammerModule,

        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: createTranslateLoader,
                deps: [HttpClient],
            },
        }),
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production,
        }),
    ],

    providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],
    bootstrap: [AppComponent],
})
export class AppModule {}
