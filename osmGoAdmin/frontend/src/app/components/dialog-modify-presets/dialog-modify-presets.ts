import { Component, OnInit, Inject } from '@angular/core';
import { TagsService } from '../../services/tags.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { MatStepper } from '@angular/material';
import { Observable } from 'rxjs';
@Component({
  selector: 'app-dialog-modify-presets',
  templateUrl: 'dialog-modify-presets.html',
  styleUrls: ['./dialog-modify-presets.scss']
})


export class DialogModifyPresetsAppComponent {
  searchTextAddPreset = '';
  presets;
  genericPresets = [];
  selectedPreset;
  typeModif;
  tagsUseThisPreset;
  primaryKey;
  primaryValue;
  enableForm = false;
  presetKeyIsFixed = false;
  statsTags;
  newValue = { 'v': '', 'lbl': '' };
  // tagsUseThisPreset: Observable<any>;

  constructor(
    public tagsService: TagsService,
    public dialogRef: MatDialogRef<DialogModifyPresetsAppComponent>,
    @Inject(MAT_DIALOG_DATA) public data) {

      this.presets = JSON.parse(JSON.stringify(this.data.presets));
      console.log(this.data);
      this.typeModif = this.data.type;
      this.primaryKey = this.data.primaryKey;
      this.primaryValue = this.data.primaryValue;
  
      this.genericPresets = this.tagsService.getGenericPresets();
  
      this.tagsService.tagsUseThisPreset$(this.presets._id).subscribe(e => {
        this.tagsUseThisPreset = e;
        console.log('ohh', e);
      });
  
  
      this.tagsService.getPrsetsSummary(this.primaryKey, this.primaryValue).subscribe(e => {
  
        console.log(e);
        this.statsTags = e;
      });
      

  }

  ngOnInit(): void {

  }

  onNoClick(): void {
    this.dialogRef.close(this.presets);
  }
  confirmChangeForAllTag(stepper, preset = null) {
    if (preset) {
      this.presets = preset;
    }

    stepper.next();
  }

  changeIdForThisTag(stepper, preset) {
    if (preset) {
      this.presets = preset;
    }
    const newId = this.data.primaryKey + '#' + this.data.primaryValue + '#' + this.presets.key;
    this.presets['_id'] = newId;
    console.log(newId);
    stepper.next();
  }

  addNewValue(newValue) {
    this.presets.tags.push(newValue);
    this.newValue = { 'v': '', 'lbl': '' };
  }

  selectPresets(selectedPreset, stepper: MatStepper) {
    console.log(selectedPreset);
    this.selectedPreset = selectedPreset;
    this.presets = selectedPreset;
    stepper.next();
  }

  newPreset(newPresetValue: string, stepper: MatStepper) {
    this.presets = { type: 'text', tags: [], 'key': newPresetValue, 'lbl': newPresetValue, _id: newPresetValue };
    console.log(newPresetValue);
    console.log(this.presets);
    stepper.next();
  }

  submit(newPreset) {
    const oldId = this.data.presets._id;
    const newId = this.presets._id;

    // // index du tag
    const findedIndex = this.tagsService.tagsConfig[this.data.primaryKey].values
      .findIndex(tag => tag.key === this.data.primaryValue);

    const currentTag = this.tagsService.tagsConfig[this.data.primaryKey].values[findedIndex];
    const presetsList = currentTag.presets;
    const indPreset = presetsList.indexOf(oldId);
    // console.log(newId);
    // cas d'un ajout par exemple
    if (indPreset === -1) {
      presetsList.push(newId);
    } else if (oldId !== newId) { // => preset spécifique à ce tag
      // on remplace l'id a utiliser dans "tags"
      presetsList[indPreset] = newId;
      // console.log(oldId, newId);
    }

    // ajout du preset dans "presets" (ou remplacement);
    this.tagsService.presetsConfig[newId] = this.presets;
    this.tagsService.postPrest(this.data.primaryKey, currentTag.key, oldId, newId, newPreset )
        .subscribe(d => console.log(d));

    this.dialogRef.close(newPreset);
  }

}
