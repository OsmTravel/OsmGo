import { Component, Input } from '@angular/core'

@Component({
    selector: 'read-primary-key',
    styleUrls: ['./style.scss'],
    templateUrl: 'READ_PrimaryKey.component.html',
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
