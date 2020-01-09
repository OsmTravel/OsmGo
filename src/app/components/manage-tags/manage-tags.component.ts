import { Component, OnInit } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { HiddenTagsComponent } from './hidden-tags/hidden-tags.component';
import { forkJoin } from 'rxjs';
import { ConfigService } from 'src/app/services/config.service';
import { TagsService } from 'src/app/services/tags.service';
import { switchMap } from 'rxjs/operators';
import { TagConfig } from 'src/type';
import { ActiveTagsComponent } from './active-tags/active-tags.component';
import { BookmarkedTagsComponent } from './bookmarked-tags/bookmarked-tags.component';
import { MapService } from 'src/app/services/map.service';

@Component({
  selector: 'app-manage-tags',
  templateUrl: './manage-tags.component.html',
  styleUrls: ['./manage-tags.component.scss'],
})
export class ManageTagsComponent implements OnInit {
  tags:TagConfig[];
  refreshFilterMapAfterClose = false;

  constructor( public modalCtrl: ModalController, 
    public configService: ConfigService,
    public mapService: MapService,
    public tagsService: TagsService, public navCtrl: NavController) { }

  ngOnInit() {
      if (!this.tagsService.tags){
        forkJoin(
          this.configService.getI18nConfig$()
          .pipe(
            switchMap( i18nConfig =>  this.configService.loadConfig$(i18nConfig))
          ),
          this.tagsService.loadSavedFields$(),
          this.tagsService.loadTagsAndPresets$()
        ).subscribe( () => {
        })
      }
  }


  async openHiddenTagsModal(){
    const modal = await this.modalCtrl.create({
      component: HiddenTagsComponent,
      // componentProps: { type: _data.type, data: _data.geojson, newPosition: newPosition, origineData: _data.origineData }
    });
    await modal.present();


    modal.onDidDismiss()
    .then(d => {
      if (d.data === true || d.data === undefined){
        this.refreshFilterMapAfterClose = true;
      }
      
    });
  }

  async openActiveTagsModal(){
    const modal = await this.modalCtrl.create({
      component: ActiveTagsComponent,
      // componentProps: { type: _data.type, data: _data.geojson, newPosition: newPosition, origineData: _data.origineData }
    });
    await modal.present();


    modal.onDidDismiss()
    .then(d => {
      if (d.data === true || d.data === undefined){
        this.refreshFilterMapAfterClose = true;
      }
    });
  }

  async openBookmarkedTagsModal(){
    const modal = await this.modalCtrl.create({
      component: BookmarkedTagsComponent,
      // componentProps: { type: _data.type, data: _data.geojson, newPosition: newPosition, origineData: _data.origineData }
    });
    await modal.present();


    modal.onDidDismiss()
    .then(d => {
     
    });
  }
  

  back(){
    console.log('back)')
    if (this.mapService.map ){ //&& this.refreshFilterMapAfterClose === true
      this.mapService.filterMakerByIds(this.tagsService.hiddenTagsIds)
    }
   
    this.navCtrl.back()
    
  }

}
