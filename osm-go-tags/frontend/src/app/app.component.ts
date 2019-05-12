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
  title = 'app';
  selectedTagKey = undefined;
  currentSprite;

  selectedTagValueConfig = undefined;


  selectedPresetConfig;
  selectedPresetId;
  generatingSprites = false;

  constructor(public tagsService: TagsService,
    public taginfoService: TaginfoService,
    public dialog: MatDialog) {

  }

  generatesSprites() {
    this.generatingSprites = true;
    this.tagsService.generatesSprites().subscribe(e => {
      console.log(e);
      this.generatingSprites = false;
    });
  }

  selectKeyTagChange(e) {
    this.selectedTagValueConfig = undefined;
    this.selectedPresetConfig = undefined;
    this.selectedPresetId = undefined;

    console.log(e);
    console.log(this.selectedTagKey);
  }

  tagValueConfigChange(t) {
    console.log(t);
    // this.tagsService.getPrsetsSummary(this.selectedTagKey, t.key).subscribe(e => {
    //   console.log(e);
    // });
    this.selectedTagValueConfig = t;
    this.currentSprite = this.tagsService.jsonSprites['circle-' + t.markerColor + '-' + t.icon];

  }

  presetSelect(preset) {
    this.selectedPresetId = preset;
    // this.selectedPresetConfig = preset;
    console.log(preset);
  }


  openPresetsDialog(typeModif: string, primaryKey: string, primaryValue: string, presets = null): void {
    console.log('openPresetsDialog', typeModif, primaryKey, primaryValue, presets);
    const dialogRef = this.dialog.open(DialogModifyPresetsAppComponent, {
      height: '80%',
      width: '80%',
      data: { type: typeModif, presets: presets, primaryKey: primaryKey, primaryValue: primaryValue }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log(result);
    });
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
    console.log(this.selectedTagKey, this.selectedTagValueConfig);
    this.tagsService.updatePrimaryTag(this.selectedTagKey, this.selectedTagValueConfig.key, this.selectedTagValueConfig)
      .subscribe(res => console.log(res));
    console.log(e);
  }

  getCountPrimaryKey(key, value) {
    if (!this.tagsService.aggStats || !this.tagsService.aggStats[key]) {
      return 0;
    }
    const statFinded = this.tagsService.aggStats[key].values.filter(el => el.value === value);
    if (!statFinded || !statFinded[0]) {
      return 0;
    } else {
      return ((statFinded[0]['count'] / this.tagsService.aggStats[key].sum) * 100).toFixed(2);
    }
  }

  toOsmPage(key, value) {
    window.open(`https://wiki.openstreetmap.org/wiki/Tag:${key}=${value}`, '_blank');
  }

  ngOnInit() {
    this.tagsService.getJsonSprite$().subscribe(jsonSprite => {
      this.tagsService.jsonSprites = jsonSprite;
    });

    this.tagsService.tagsConfig$.subscribe(data => {
      this.tagsService.tagsConfig = data;
      this.selectedTagKey = 'shop';
    });

    this.tagsService.getFullStat$().subscribe(data => {
      this.tagsService.aggStats = data;
      console.log(data);
    });
    // this.taginfoService.getCombinations('shop', 'jewelry', 100).subscribe(data => {
    //   console.log(data);
    // });
    // this.tagsService.getTagsConfig().subscribe(data => {
    //   this.tagsConfig = data;
    //   console.log(this.tagsConfig);
    // });

    // this.tagsService.getPresetsConfig().subscribe(data => {
    //   this.presetsConfig = data;
    //   console.log(this.presetsConfig);
    // });
  }

}
