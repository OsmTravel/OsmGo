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
  @Input() jsonSprites
  @Input() geometriesFilter: string[];
  @Input() bookmarksIds: string[];

  @Output() removeBookmark = new EventEmitter();
  @Output() addBookmark = new EventEmitter();


  @Output() selected = new EventEmitter();


  constructor() { }

  ngOnInit() {

  }

  isBookMarked(tag) {
    // TODO pipe
    return this.bookmarksIds.includes(tag.id)
  }

  addOrRemoveBookmark(tag) {
    const isBookMarked = this.isBookMarked(tag);
    if (isBookMarked) {
      this.removeBookmark.emit(tag)
    } else {
      this.addBookmark.emit(tag)
    }
  }

}
