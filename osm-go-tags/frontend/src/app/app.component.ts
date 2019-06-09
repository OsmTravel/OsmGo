import { Component, OnInit, Inject } from '@angular/core';
import { TagsService } from './tags.service';
import { DialogModifyPresetsAppComponent } from './dialog-modify-presets/dialog-modify-presets';

import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { TaginfoService } from './taginfo.service';
import { DialogIconComponent } from './dialog-icon/dialog-icon.component';
import { DialogAddPrimaryValueComponent } from './dialog-add-primary-value/dialog-add-primary-value.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  

  constructor(public tagsService: TagsService,
    public taginfoService: TaginfoService,
    public dialog: MatDialog) {

  }

  ngOnInit(){
    
  }

}
