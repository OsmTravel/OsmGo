import { Component, OnInit } from '@angular/core';
import { ConfigService } from 'src/app/services/config.service';
import { TagsService } from 'src/app/services/tags.service';
import { ModalController } from '@ionic/angular';
import { TagConfig } from 'src/type';

@Component({
  selector: 'app-active-tags',
  templateUrl: './active-tags.component.html',
  styleUrls: ['./active-tags.component.scss', '../sharedStyle.scss'],
})
export class ActiveTagsComponent implements OnInit {

  searchText = ''
  refreshFilterMapAfterClose = false;

  constructor(public configService: ConfigService,
    public tagsService: TagsService,
    public modalCtrl: ModalController) { }

  ngOnInit() {
  }

  removeHiddenTag(tag:TagConfig){
    this.tagsService.removeHiddenTag(tag);
    this.refreshFilterMapAfterClose = true;
  }

  addHiddenTag(tag:TagConfig){
   this.tagsService.addHiddenTag(tag);
  }

}
