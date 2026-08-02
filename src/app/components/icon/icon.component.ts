import { Component, computed, input, signal } from '@angular/core'
import type { JsonSprites } from '@osmgo/type'

@Component({
    selector: 'app-icon',
    templateUrl: './icon.component.html',
    styleUrls: ['./icon.component.scss'],
})
export class IconComponent {
    readonly jsonSprites = input.required<JsonSprites>()
    readonly icon = input<string | null>()
    readonly sprite = computed(() => {
        const icon = this.icon()
        return icon ? this.jsonSprites()[icon] : undefined
    })
    readonly fallbackSprite = computed(
        () => this.jsonSprites()['wiki-question']
    )
    readonly devicePixelRatio = signal(window.devicePixelRatio > 1 ? 2 : 1)
}
