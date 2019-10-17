import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { uniqBy, orderBy} from 'lodash'

@Component({
  selector: 'app-presets-options',
  templateUrl: './presets-options.component.html',
  styleUrls: ['./presets-options.component.css']
})
export class PresetsOptionsComponent implements OnInit {

  @Input() selectedPreset;
  @Output() presetChange = new EventEmitter<any>(); 
  newPresetOption = {v:null, lbl: null}

  constructor() { }

  ngOnInit() {
  }

  _orderBy(property){
    this.selectedPreset.tags = orderBy(this.selectedPreset.tags, [property])
  }

  addOption(newOption){
    this.selectedPreset.tags = uniqBy([...this.selectedPreset.tags, newOption],'v')
    this.newPresetOption = {v:null, lbl: null}
    this.presetChange.emit(this.selectedPreset)
  }


  deleteOption(option){
    this.selectedPreset.tags = [...this.selectedPreset.tags.filter( t => t.v !== option.v)]
    this.presetChange.emit(this.selectedPreset)
  }

  optionChangeOrder(index, newIndex){
    this.array_move(this.selectedPreset.tags, index,newIndex)
    this.presetChange.emit(this.selectedPreset)
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
