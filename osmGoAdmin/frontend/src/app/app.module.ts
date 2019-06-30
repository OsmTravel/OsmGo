import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import {MatDialogModule} from '@angular/material/dialog';
import { MatButtonModule, MatCheckboxModule, MatSelectModule, MatInputModule, MatFormFieldModule} from '@angular/material';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatStepperModule} from '@angular/material/stepper';
import {MatIconModule} from '@angular/material/icon';
import {MatGridListModule} from '@angular/material/grid-list';
import {DialogModifyPresetsAppComponent} from './components/dialog-modify-presets/dialog-modify-presets';
import { KeyPipe } from './key.pipe';
import { FilterByKeyLblPipe } from './pipe/filter-by-key-lbl.pipe';
import { DialogIconComponent } from './components/dialog-icon/dialog-icon.component';
import { FilterByNamePipe } from './pipe/filter-by-name.pipe';
import { DialogAddPrimaryValueComponent } from './components/dialog-add-primary-value/dialog-add-primary-value.component';
import { TagsComponent } from './components/tags/tags.component';
import { HomeComponent } from './components/home/home.component';
import { TranslateUiComponent } from './components/translate-ui/translate-ui.component';
import {MatToolbarModule} from '@angular/material/toolbar';
import { OrderByPipe } from './pipe/order-by.pipe';
import { AddUiLanguageComponent } from './components/add-ui-language/add-ui-language.component';
import { AddNewConfigurationComponent } from './components/add-new-configuration/add-new-configuration.component';
import { SettingPkeyComponent } from './components/setting-pkey/setting-pkey.component';

const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'tags', component: TagsComponent },
  { path: 'translateUi', component: TranslateUiComponent }
];

@NgModule({
  declarations: [
    AppComponent, DialogModifyPresetsAppComponent, KeyPipe, FilterByKeyLblPipe, 
    DialogIconComponent, FilterByNamePipe, DialogAddPrimaryValueComponent, TagsComponent, HomeComponent, TranslateUiComponent, OrderByPipe, AddUiLanguageComponent, AddNewConfigurationComponent, SettingPkeyComponent,
  ],
  imports: [
    RouterModule.forRoot(
      appRoutes,
      { useHash: true } 
    ),
    BrowserModule, HttpClientModule, BrowserAnimationsModule,
    MatButtonModule, MatCheckboxModule, MatSelectModule, MatInputModule, MatFormFieldModule, FormsModule,
    MatDialogModule, MatStepperModule, MatGridListModule, MatSlideToggleModule, MatProgressSpinnerModule, 
    MatTooltipModule, MatIconModule , MatToolbarModule
  ],
  providers: [],
  entryComponents: [DialogModifyPresetsAppComponent, DialogIconComponent, DialogAddPrimaryValueComponent,
    SettingPkeyComponent,
    AddUiLanguageComponent, AddNewConfigurationComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
