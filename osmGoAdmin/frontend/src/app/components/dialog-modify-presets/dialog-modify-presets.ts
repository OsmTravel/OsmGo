import { Component, OnInit, Inject } from '@angular/core';
import { TagsService } from '../../services/tags.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-dialog-modify-presets',
  templateUrl: 'dialog-modify-presets.html',
  styleUrls: ['./dialog-modify-presets.scss']
})


export class DialogModifyPresetsAppComponent {
  step = 1;
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
  proposalTags;
  // tagsUseThisPreset: Observable<any>;

  constructor(
    public tagsService: TagsService,
    public dialogRef: MatDialogRef<DialogModifyPresetsAppComponent>,
    @Inject(MAT_DIALOG_DATA) public data) {

      this.presets = JSON.parse(JSON.stringify(this.data.presets));
      this.typeModif = this.data.type;
      this.primaryKey = this.data.primaryKey;
      this.primaryValue = this.data.primaryValue;

      this.genericPresets = this.tagsService.getGenericPresets();
  
      this.tagsService.tagsUseThisPreset$(this.presets._id).subscribe(e => {
        this.tagsUseThisPreset = e;
        if(this.typeModif == 'add'){
          this.step = 1;
        } else if (this.typeModif == 'update') {
          if (!/#/.test(this.presets._id)){
            // is generic
            this.step = 2;
          } else {
            this.step = 4;
          }
        } else{
          this.step = 3;
        }
      });
  
  
      this.tagsService.getPresetsSummary(this.tagsService.country, this.primaryKey, this.primaryValue).subscribe(e => {
        this.statsTags = e;
      });
      

  }

  ngOnInit(): void {



  }
  getProposalTags(key){
    // TODO: devrait être dans un pipe
    let statTagKey = this.statsTags.find(s => s.key == this.presets.key) 
    if (!statTagKey || ! statTagKey.tags){
      return [];
    }
    const tagVused = this.presets.tags.map(t => t.v);
    const proposalTags = statTagKey.tags.filter( t => !tagVused.includes(t.value));
    return proposalTags
    
    
  }

  onNoClick(): void {
    this.dialogRef.close(this.presets);
  }
  confirmChangeForAllTag( preset = null) {
    if (preset) {
      this.presets = preset;
    }

      this.step = 4;
  }

  changeIdForThisTag( preset) {
    if (preset) {
      this.presets = preset;
    }


    const newId = this.data.primaryKey + '#' + this.data.primaryValue + '#' + this.presets.key;
    this.presets['_id'] = newId;
    this.step = 4;
  }

  addNewValue(newValue) {
    this.presets.tags.push(newValue);
    this.newValue = { 'v': '', 'lbl': '' };
  }

  addThisPresetOption(value){
    this.presets.tags.push({ 'v': value, 'lbl': value});
  }

  selectPresets(selectedPreset) {
    this.selectedPreset = selectedPreset;
    this.presets = selectedPreset;
    if (this.typeModif == 'add'){
      this.step = 3
    }
    
  }

  newPreset(newPresetValue: string) {
    this.presets = { type: 'text', tags: [], 'key': newPresetValue, 'lbl': newPresetValue, _id: newPresetValue };
    this.step++;
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
    // cas d'un ajout par exemple
    if (indPreset === -1) {
      presetsList.push(newId);
    } else if (oldId !== newId) { // => preset spécifique à ce tag
      // on remplace l'id a utiliser dans "tags"
      presetsList[indPreset] = newId;
    }

    // ajout du preset dans "presets" (ou remplacement);
    this.tagsService.presetsConfig[newId] = this.presets;
    this.tagsService.postPreset(this.data.primaryKey, currentTag.key, oldId, newId, newPreset )
        .subscribe();

    this.dialogRef.close(newPreset);
  }

}
