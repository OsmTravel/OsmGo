import { Component, OnInit, Inject } from '@angular/core';
import { DataService } from '../../services/data.service';
import { TagsService } from '../../services/tags.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import * as _ from 'lodash';    

@Component({
  selector: 'app-setting-pkey',
  templateUrl: './setting-pkey.component.html',
  styleUrls: ['./setting-pkey.component.css']
})
export class SettingPkeyComponent implements OnInit {

  primaryKey
  tagsConfig
  newExcludeWay = null;

  constructor( public dataService : DataService, 
    public tagsService : TagsService,
    public dialogRef: MatDialogRef<SettingPkeyComponent>,
    @Inject(MAT_DIALOG_DATA) public data) { }

  ngOnInit() {
 
    console.log(this.data)
    this.primaryKey = this.data.primaryKey
    this.tagsConfig = _.cloneDeep(this.tagsService.tagsConfig[this.primaryKey]);
    if ( !this.tagsConfig['exclude_way_values']){
      this.tagsConfig['exclude_way_values'] = [];
    }
    // exclude_way_values , lbl, type, values
  }

  deleteExcludeWayValues(item){
    let index = this.tagsConfig['exclude_way_values'].indexOf(item);
    if (index >= 0 ){
      this.tagsConfig['exclude_way_values'].splice(index, 1)
    }
    
    console.log(index);
  }

  addExcludeWay(value){
    console.log(value);
    if (this.tagsConfig['exclude_way_values'].includes(value)){
      this.newExcludeWay = null
      return;
    }
    this.tagsConfig['exclude_way_values'] = [value, ...this.tagsConfig['exclude_way_values']]
    this.newExcludeWay = null
  }

  sendData(data){
    console.log(data);

    this.tagsService.postTagSettings$(this.primaryKey, data.lbl, data.exclude_way_values  )
      .subscribe( e => {
        this.tagsService.tagsConfig[this.primaryKey]['lbl'] = data.lbl;
        this.tagsService.tagsConfig[this.primaryKey]['exclude_way_values'] = data.exclude_way_values;
        this.dialogRef.close();

      })
  }


}
