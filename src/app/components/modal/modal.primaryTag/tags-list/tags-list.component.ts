import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { TagConfig } from 'src/type';


@Component({
  selector: 'app-tags-list',
  templateUrl: './tags-list.component.html',
  styleUrls: ['./tags-list.component.scss'],
})
export class TagsListComponent implements OnInit {

  @Input() tags: any;
  @Input() countryTags;
  @Input() languageTags;
  @Input() searchText: string;
  @Input() oldTagConfig: TagConfig;
  @Input() bookmarks: TagConfig[];
  @Input() jsonSprites
  @Input() geometriesFilter: string[];

  @Output() addRemoveToBookmarks = new EventEmitter();
  @Output() selected = new EventEmitter();
  

  constructor() { }

  ngOnInit() {
   
  }

  isBookMarked(tag) {
    const bM: any = this.bookmarks;
    for (let i = 0; i < bM.length; i++) {
        if (bM[i].id === tag.id) {
            return true;
        }
    }
    return false;
}

}
