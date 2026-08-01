import {
    HttpClient,
    provideHttpClient,
    withInterceptorsFromDi,
    withXhr,
} from '@angular/common/http'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { RouteReuseStrategy } from '@angular/router'
import { AppComponent } from '@app/app.component'
import { AppRoutingModule } from '@app/app-routing.module'
import { MetaCard } from '@app/components/modal/components/meta-card/MetaCard'

import { AboutPage } from '@components/about/about'
import { IconComponent } from '@components/icon/icon.component'
import { MainPage } from '@components/main/main'
import { MenuPage } from '@components/menu/menu'
import { AlertComponent } from '@components/modal/components/alert/alert.component'
import { EditOtherTag } from '@components/modal/components/edit/OtherTag.component'
import { EditPresets } from '@components/modal/components/edit/Presets.component'
import { OpeningHoursComponent } from '@components/modal/components/opening-hours/opening-hours.component'
import { PrimaryKey } from '@components/modal/components/primary-key/PrimaryKey'
import { ReadOtherTag } from '@components/modal/components/read/OtherTag.component'
import { ReadPresets } from '@components/modal/components/read/Presets.component'
import { SurveyCard } from '@components/modal/components/survey-card/SurveyCard'
import { ModalsContentPage } from '@components/modal/modal'
import { ModalAddTag } from '@components/modal/modal.addTag/modal.addTag'
import { ModalPrimaryTag } from '@components/modal/modal.primaryTag/modal.primaryTag'
import { ModalSelectList } from '@components/modal/modalSelectList/modalSelectList'
import { PushDataToOsmPage } from '@components/pushDataToOsm/pushDataToOsm'
import { SettingsPage } from '@components/settings/settings'
import { IonicModule, IonicRouteStrategy } from '@ionic/angular'
import { IonicStorageModule } from '@ionic/storage-angular'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { CharLimitPipe } from '@pipes/charLimit.pipe'
import { DisplayPresetLabelPipe } from '@pipes/displayPresetLabel.pipe'
import { FilterByCountryCode } from '@pipes/filterByCountryCode.pipe'
import { FilterByListPipe } from '@pipes/filterByList.pipe'
import { FilterByPresetsContentPipe } from '@pipes/filterByPresetsContent.pipe'
import { FilterByTagsContentPipe } from '@pipes/filterByTagsContent.pipe'
import { FilterDeprecatedTagPipe } from '@pipes/filterDeprecatedTag.pipe'
import { FilterExcludeKeysPipe } from '@pipes/filterExcludeKeys.pipe'
import { FilterExcludeTagByCountryCode } from '@pipes/filterExcludeTagByCountryCode.pipe'
import { FilterPresetsByListPipe } from '@pipes/filterPresetsByList.pipe'
import { OrderByPresetPipe } from '@pipes/orderByPreset.pipe'
import { RemoveBrandsPipe } from '@pipes/removeBrands.pipe'
import { SearchForPipe } from '@pipes/searchFor.pipe'
import { ToOsmTagPipe } from '@pipes/toOsmTag.pipe'

import { MomentModule } from 'ngx-moment'
import 'moment/locale/en-gb'
import 'moment/locale/fr'
import { ServiceWorkerModule } from '@angular/service-worker'
import { BasemapsComponent } from '@components/basemaps/basemaps.component'
import { DialogMultiFeaturesComponent } from '@components/dialog-multi-features/dialog-multi-features.component'
import { ActiveTagsComponent } from '@components/manage-tags/active-tags/active-tags.component'
import { BookmarkedTagsComponent } from '@components/manage-tags/bookmarked-tags/bookmarked-tags.component'
import { HiddenTagsComponent } from '@components/manage-tags/hidden-tags/hidden-tags.component'
import { ManageTagsComponent } from '@components/manage-tags/manage-tags.component'
import { ModalAddOpeningHoursIntervalComponent } from '@components/modal/components/opening-hours/modal-add-opening-hours-interval/modal-add-opening-hours-interval.component'
import { SelectComponent } from '@components/modal/components/select/select.component'
import { TagListElementComponent } from '@components/tag-list-element/tag-list-element.component'
import { environment } from '@environments/environment'
import { DisplayTagsPipe } from '@pipes/display-tags.pipe'
import { FilterByByGeometryTypePipe } from '@pipes/filter-by-geometry-type.pipe'
import { FilterBySearchablePipe } from '@pipes/filter-by-searchable.pipe'
import { FiltersTagsByIdsPipe } from '@pipes/filters-tags-by-ids.pipe'
import { IsBookmarkedPipe } from '@pipes/is-bookmarked.pipe'
import { LimitDisplayTagsPipe } from '@pipes/limit-display-tags.pipe'
import { MinutesToHoursMinutesPipe } from '@pipes/minutes-to-hours-minutes.pipe'
import { SortArrayPipe } from '@pipes/sort-array.pipe'

export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json')
}

@NgModule({
    declarations: [
        AppComponent,
        MainPage,
        AboutPage,
        MenuPage,
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
        MomentModule,
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
    providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
