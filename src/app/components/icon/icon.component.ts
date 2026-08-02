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
    readonly renderMode = input<'sprite' | 'svg'>('sprite')
    readonly resolvedIcon = computed(() => {
        const icon = this.icon()
        return icon && this.jsonSprites()[icon] ? icon : 'wiki-question'
    })
    readonly svgPath = computed(
        () => `assets/osm-icons/${encodeURIComponent(this.resolvedIcon())}.svg`
    )
    readonly loadedSvgPath = signal<string | null>(null)
    readonly svgIsLoaded = computed(
        () => this.loadedSvgPath() === this.svgPath()
    )
    readonly renderedSprite = computed(() => {
        const sprite = this.jsonSprites()[this.resolvedIcon()]
        if (!sprite) {
            return undefined
        }

        const pixelRatio = sprite.pixelRatio || 1
        const width = sprite.width / pixelRatio
        const height = sprite.height / pixelRatio
        return {
            x: sprite.x / pixelRatio,
            y: sprite.y / pixelRatio,
            width,
            height,
            viewportHeight: Math.min(width, height),
        }
    })

    onSvgLoad(event: Event) {
        const path = (event.currentTarget as HTMLImageElement).getAttribute(
            'src'
        )
        this.loadedSvgPath.set(path)
    }

    onSvgError(event: Event) {
        const path = (event.currentTarget as HTMLImageElement).getAttribute(
            'src'
        )
        if (this.loadedSvgPath() === path) {
            this.loadedSvgPath.set(null)
        }
    }
}
