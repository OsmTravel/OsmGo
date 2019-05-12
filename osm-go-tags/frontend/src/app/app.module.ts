import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import {MatDialogModule} from '@angular/material/dialog';
import { MatButtonModule, MatCheckboxModule, MatSelectModule, MatInputModule, MatFormFieldModule} from '@angular/material';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatStepperModule} from '@angular/material/stepper';
import {MatIconModule} from '@angular/material/icon';
import {MatGridListModule} from '@angular/material/grid-list';
import {DialogModifyPresetsAppComponent} from './dialog-modify-presets/dialog-modify-presets';
import { KeyPipe } from './key.pipe';
import { FilterByKeyLblPipe } from './pipe/filter-by-key-lbl.pipe';
import { DialogIconComponent } from './dialog-icon/dialog-icon.component';
import { FilterByNamePipe } from './pipe/filter-by-name.pipe';
import { DialogAddPrimaryValueComponent } from './dialog-add-primary-value/dialog-add-primary-value.component';


@NgModule({
  declarations: [
    AppComponent, DialogModifyPresetsAppComponent, KeyPipe, FilterByKeyLblPipe, 
    DialogIconComponent, FilterByNamePipe, DialogAddPrimaryValueComponent
  ],
  imports: [
    BrowserModule, HttpClientModule, BrowserAnimationsModule,
    MatButtonModule, MatCheckboxModule, MatSelectModule, MatInputModule, MatFormFieldModule, FormsModule,
    MatDialogModule, MatStepperModule, MatGridListModule, MatSlideToggleModule, MatProgressSpinnerModule,MatIconModule
  ],
  providers: [],
  entryComponents: [DialogModifyPresetsAppComponent, DialogIconComponent, DialogAddPrimaryValueComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
