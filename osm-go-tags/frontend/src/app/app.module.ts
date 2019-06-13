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
import {DialogModifyPresetsAppComponent} from './dialog-modify-presets/dialog-modify-presets';
import { KeyPipe } from './key.pipe';
import { FilterByKeyLblPipe } from './pipe/filter-by-key-lbl.pipe';
import { DialogIconComponent } from './dialog-icon/dialog-icon.component';
import { FilterByNamePipe } from './pipe/filter-by-name.pipe';
import { DialogAddPrimaryValueComponent } from './dialog-add-primary-value/dialog-add-primary-value.component';
import { TagsComponent } from './tags/tags.component';
import { HomeComponent } from './home/home.component';
import { TranslateUiComponent } from './translate-ui/translate-ui.component';
import {MatToolbarModule} from '@angular/material/toolbar';

const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'tags', component: TagsComponent },
  { path: 'translateUi', component: TranslateUiComponent }
  
];

@NgModule({
  declarations: [
    AppComponent, DialogModifyPresetsAppComponent, KeyPipe, FilterByKeyLblPipe, 
    DialogIconComponent, FilterByNamePipe, DialogAddPrimaryValueComponent, TagsComponent, HomeComponent, TranslateUiComponent
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
  entryComponents: [DialogModifyPresetsAppComponent, DialogIconComponent, DialogAddPrimaryValueComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
