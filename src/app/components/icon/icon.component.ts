import { Component, input, signal } from '@angular/core'

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
})
export class IconComponent {
    readonly jsonSprites = input.required<Record<string, SpritePosition>>()
    readonly icon = input(undefined)
    readonly devicePixelRatio = signal(window.devicePixelRatio > 1 ? 2 : 1)
}
