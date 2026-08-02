import {
    ChangeDetectionStrategy,
    Component,
    input,
    OnInit,
} from '@angular/core'

interface SpritePosition {
    height: number
    width: number
    x: number
    y: number
}

@Component({
    selector: 'app-icon',
    templateUrl: './icon.component.html',
    styleUrls: ['./icon.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class IconComponent implements OnInit {
    readonly jsonSprites = input.required<Record<string, SpritePosition>>()
    readonly icon = input(undefined)
    currentSpriteConfig
    styleBackgroundPosition
    devicePixelRatio

    ngOnInit() {
        this.devicePixelRatio = window.devicePixelRatio > 1 ? 2 : 1
    }
}
