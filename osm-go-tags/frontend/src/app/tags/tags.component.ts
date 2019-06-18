import { Component, OnInit } from '@angular/core';
import { TagsService } from '../tags.service';
import { TaginfoService } from '../taginfo.service';
import { MatDialog } from '@angular/material';
import { DialogModifyPresetsAppComponent } from '../dialog-modify-presets/dialog-modify-presets';
import { DialogIconComponent } from '../dialog-icon/dialog-icon.component';
import { DialogAddPrimaryValueComponent } from '../dialog-add-primary-value/dialog-add-primary-value.component';
import { ActivatedRoute, Router } from '@angular/router';
import * as _ from 'lodash';

@Component({
  selector: 'app-tags',
  templateUrl: './tags.component.html',
  styleUrls: ['./tags.component.css']
})
export class TagsComponent implements OnInit {
  selectedTagKey = undefined;
  currentSprite;
  selectedTagValueConfig = undefined;
  selectedPresetConfig;
  selectedPresetId;
  generatingSprites = false;
  orderKey = 'key';
  orderType = 'asc'

  constructor(
    public tagsService: TagsService,
    public taginfoService: TaginfoService,
    public dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit() {
    if (!this.tagsService.language || !this.tagsService.country){
      this.router.navigate(['/']);

      return
    }


    this.tagsService.getJsonSprite$().subscribe(jsonSprite => {
      this.tagsService.jsonSprites = jsonSprite;
    });

    this.tagsService.tagsConfig$(this.tagsService.language,this.tagsService.country ).subscribe(data => {
      // this.tagsService.tagsConfig = data;
      this.selectedTagKey = 'shop';
    });
  }

  generatesSprites() {
    this.generatingSprites = true;
    this.tagsService.generatesSprites(this.tagsService.language, this.tagsService.country).subscribe(e => {
      console.log(e);
      this.generatingSprites = false;
    });
  }

  deleteTag(key, value){
   
    this.tagsService.deleteTag(key, value).subscribe( deleted => {
      this.tagsService.tagsConfig[key].values = this.tagsService.tagsConfig[key].values.filter( f => f.key !== value);

    });
  }

  selectKeyTagChange(e) {
    this.selectedTagValueConfig = undefined;
    this.selectedPresetConfig = undefined;
    this.selectedPresetId = undefined;
  }

  tagValueConfigChange(t) {
    this.selectedTagValueConfig = t;
    this.currentSprite = this.tagsService.jsonSprites['circle-' + t.markerColor + '-' + t.icon];

  }

  presetSelect(preset) {
    this.selectedPresetId = preset;
  }


  openPresetsDialog(typeModif: string, primaryKey: string, primaryValue: string, presets = null): void {
   
    const dialogRef = this.dialog.open(DialogModifyPresetsAppComponent, {
      height: '80%',
      width: '80%',
      data: { type: typeModif, presets: presets, primaryKey: primaryKey, primaryValue: primaryValue }
    });

    dialogRef.afterClosed().subscribe(result => {
      // console.log(result);
    });
  }

  deletePresetFromTag(primaryKey: string, primaryValue: string, presets ){
    let currentTag =  this.tagsService.tagsConfig[primaryKey].values.find( e => e.key === primaryValue)
    const idIndex = currentTag.presets.indexOf(presets._id)
    currentTag.presets.splice(idIndex, 1);
    this.tagsService.updatePrimaryTag(primaryKey, primaryValue, currentTag)
      .subscribe(res => console.log(res));
    // currentTag.presets.splice(1,presets._id)

  }

  openDialogIconsSelector(primaryKey: string, primaryValue: string) {
    const dialogRef = this.dialog.open(DialogIconComponent, {
      height: '80%',
      width: '80%',
      data: { primaryKey: primaryKey, primaryValue: primaryValue }

    });

    dialogRef.afterClosed().subscribe(result => {
      console.log(result);
    });
  }

  openDialogAddPrimaryValue(primaryKey: string) {
    const dialogRef = this.dialog.open(DialogAddPrimaryValueComponent, {
      height: '80%',
      width: '80%',
      data: { primaryKey: primaryKey }

    });

    dialogRef.afterClosed().subscribe(result => {
      console.log(result);
    });
  }

  primaryTagHasChanged(e) {
    this.tagsService.updatePrimaryTag(this.selectedTagKey, this.selectedTagValueConfig.key, this.selectedTagValueConfig)
      .subscribe(res => console.log(res));
  }

  getCountPrimaryKey(key, value) {
    if (!this.tagsService.aggStats || !this.tagsService.aggStats[key]) {
      return 0;
    }
    const statFinded = this.tagsService.aggStats[key].values.filter(el => el.value === value);
    if (!statFinded || !statFinded[0]) {
      return 0;
    } else {
      return ((statFinded[0]['count'] / this.tagsService.aggStats[key].sum) * 100).toFixed(3);
    }
  }

  toOsmPage(key, value) {
    window.open(`https://wiki.openstreetmap.org/wiki/Tag:${key}=${value}`, '_blank');
  }


  changeOrder(key){
    this.orderKey = key;
    if (this.orderKey === key){
      this.orderType = ( this.orderType  === 'asc' ) ? 'desc' : 'asc'
    }
  }


}
