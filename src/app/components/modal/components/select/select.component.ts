import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',

  styleUrls: ['./select.component.scss', '../style.scss'],
})
export class SelectComponent implements OnInit {

  @Input() displayCode;
  @Input() tag;
  @Input() language;
  
  @Output() addTags = new EventEmitter();

 
  constructor() { }

  ngOnInit() {

  }

  selectChange(e){
    console.log('selectChange')
    const newValue = e.detail.value;
    this.tag['value'] = newValue

    const currentPresetOption = this.tag.preset.options.find( po => po.v == newValue);
    if (currentPresetOption && currentPresetOption.tags){
      this.addTags.emit(currentPresetOption.tags)
    }
  }

}
