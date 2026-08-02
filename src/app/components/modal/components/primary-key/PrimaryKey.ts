import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core'
import { IconComponent } from '@components/icon/icon.component'
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone'
import { OsmGoFeature, PrimaryTag } from '@osmgo/type'
import { DisplayTagsPipe } from '@pipes/display-tags.pipe'

@Component({
    selector: 'primary-key',
    styleUrls: ['PrimaryKey.scss'],
    templateUrl: 'PrimaryKey.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [DisplayTagsPipe, IconComponent, IonCard, IonCardContent, IonIcon],
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
