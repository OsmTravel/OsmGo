import { Component, Input, Output, EventEmitter } from '@angular/core'
import { OsmGoFeature, PrimaryTag } from '@osmgo/type'

@Component({
    selector: 'primary-key',
    styleUrls: ['PrimaryKey.scss'],
    templateUrl: 'PrimaryKey.html',
})
export class PrimaryKey {
    @Output() openPrimaryTagModal = new EventEmitter()
    @Output() toggleBookmark = new EventEmitter()

    @Input() tagConfig
    @Input() language
    @Input() jsonSprites
    @Input() isBookmarked

    @Input() displayCode
    @Input() isEditMode

    ngOnInit(): void {}
    emitOpenModal() {
        this.openPrimaryTagModal.emit()
    }
    emitToggleBookmark() {
        this.toggleBookmark.emit()
    }
}

/*
@Component({
  selector: 'read-primary-key',
  styleUrls: ['../style.scss'],
  templateUrl: 'PrimaryKey.component.html',
})
export class ReadPrimaryKey {
  @Input() displayCode
  @Input() tagsConfig
  @Input() tagConfig
  @Input() language
  @Input() feature
  @Input() jsonSprites
  @Input() primaryKeys

  primaryKey

  ngOnInit(): void {
      this.primaryKey = this.findPkey(this.feature)

      // console.log(this.currentSpriteConfig);
  }

  findPkey(feature) {
      const pkeys = this.primaryKeys
      for (let k in feature.properties.tags) {
          if (pkeys.includes(k)) {
              return { key: k, value: feature.properties.tags[k] }
          }
      }
  }
}
*/
