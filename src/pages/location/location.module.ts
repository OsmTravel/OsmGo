import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { LocationPage } from './location';

@NgModule({
  declarations: [
    LocationPage,
  ],
  imports: [
    IonicPageModule.forChild(LocationPage),
  ],
})
export class LocationPageModule {}
