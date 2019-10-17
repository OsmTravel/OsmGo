import { Component, OnInit } from '@angular/core';
import { TagsService } from 'src/app/services/tags.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-presets',
  templateUrl: './presets.component.html',
  styleUrls: ['./presets.component.scss']
})
export class PresetsComponent implements OnInit {

  presets;
  flatTags
  newPresetOption = {v:null, lbl: null}
  selectedIdInit;

  selectedPreset;
  constructor(private route: ActivatedRoute,
    private router: Router,
    public tagsService: TagsService) { }

  ngOnInit() {
    this.tagsService.language = this.route.snapshot.paramMap.get("language")
    this.tagsService.country = this.route.snapshot.paramMap.get("country")

    this.route.queryParams
    .subscribe(params => {
      if (params.presetId){
       this.selectedIdInit = params.presetId;
      }
    });

    this.tagsService.tagsConfig$(this.tagsService.language, this.tagsService.country)
      .subscribe(t => {
        const flatTags = [];
        for (let pkey in t) {
          for (let tag of t[pkey].values) {
            flatTags.push({ "pkey": pkey, ...tag })
          }
        }
        this.flatTags = [...flatTags]

        this.tagsService.getPresetsConfig$(this.tagsService.language, this.tagsService.country)
          .subscribe(e => {
            let presets = [];
            for (let key in e) {
              let usedByTags= this.flatTags.filter( o => o.presets.includes(e[key]._id) )
              presets.push({...e[key], usedByTagsCount: usedByTags.length})
            }
            this.presets = presets;
            if ( this.selectedIdInit){
              const p = this.presets.find( o => o._id == this.selectedIdInit);
              if (p){
                this.selectPreset(p)
              }
              
            }
          })

      })
  }


  selectPreset(preset){
    let usedByTags = this.flatTags.filter( o => o.presets.includes(preset._id) )
    this.selectedPreset = {...preset, usedByTags: usedByTags }  ;
    this.router.navigate([], {
      queryParams: {
        presetId: preset._id
      },
      queryParamsHandling: 'merge',
    });
  }


  updatePreset(preset){
    const oldId = preset._id;
    const newId = preset._id;

    this.tagsService.postPreset(null, null, oldId, newId, preset )
        .subscribe();

  }

  labelChange(){
    this.updatePreset(this.selectedPreset)
  }

  addOption(newOption){
    this.selectedPreset.tags = [...this.selectedPreset.tags, newOption]
    this.newPresetOption = {v:null, lbl: null}
    this.updatePreset(this.selectedPreset)
  }

  deleteOption(option){
    this.selectedPreset.tags = [...this.selectedPreset.tags.filter( t => t.v !== option.v)]
    this.updatePreset(this.selectedPreset)
  }

  optionChangeOrder(index, newIndex){
    this.array_move(this.selectedPreset.tags, index,newIndex)
    this.updatePreset(this.selectedPreset)
  }

  array_move(arr, old_index, new_index) {
    if (new_index >= arr.length) {
        var k = new_index - arr.length + 1;
        while (k--) {
            arr.push(undefined);
        }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
};

}
