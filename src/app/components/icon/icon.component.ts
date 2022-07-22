import { Component, OnInit, Input } from '@angular/core'
import { environment } from '@environments/environment'

@Component({
    selector: 'app-icon',
    templateUrl: './icon.component.html',
    styleUrls: ['./icon.component.scss'],
})
export class IconComponent implements OnInit {
    @Input() jsonSprites
    @Input() icon
    currentSpriteConfig
    styleBackgroundPosition
    devicePixelRatio

    constructor() {}

    ngOnInit() {
        this.devicePixelRatio = window.devicePixelRatio > 1 ? 2 : 1
    }

    get spriteUrl() {
        const basePath = environment.urlBasePath || ''
        return `url(${basePath}/assets/iconsSprites@x${this.devicePixelRatio}.png)`
    }
}
