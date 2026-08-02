import { TestBed } from '@angular/core/testing'

import { IconComponent } from './icon.component'

describe('IconComponent', () => {
    it('normalizes a high-density sprite to its logical dimensions', () => {
        const fixture = TestBed.createComponent(IconComponent)
        fixture.componentRef.setInput('icon', 'temaki-pedestrian')
        fixture.componentRef.setInput('jsonSprites', {
            'temaki-pedestrian': {
                x: 96,
                y: 1480,
                width: 48,
                height: 72,
                pixelRatio: 2,
            },
        })
        fixture.detectChanges()

        const sprite = fixture.nativeElement.querySelector(
            '.sprite'
        ) as HTMLElement
        const wrapper = fixture.nativeElement.querySelector(
            '.iconWrapper'
        ) as HTMLElement

        expect(sprite.style.width).toBe('24px')
        expect(sprite.style.height).toBe('36px')
        expect(sprite.style.backgroundPosition).toBe('-48px -740px')
        expect(wrapper.style.width).toBe('24px')
        expect(wrapper.style.height).toBe('24px')
    })

    it('keeps the sprite fallback until the vector asset is loaded', () => {
        const fixture = TestBed.createComponent(IconComponent)
        fixture.componentRef.setInput('icon', 'mi-parking')
        fixture.componentRef.setInput('renderMode', 'svg')
        fixture.componentRef.setInput('jsonSprites', {
            'mi-parking': {
                x: 0,
                y: 0,
                width: 24,
                height: 36,
                pixelRatio: 1,
            },
            'mi-bus-station': {
                x: 24,
                y: 0,
                width: 24,
                height: 36,
                pixelRatio: 1,
            },
        })
        fixture.detectChanges()

        const image = fixture.nativeElement.querySelector(
            '.svgIcon'
        ) as HTMLImageElement

        expect(image.getAttribute('src')).toBe(
            'assets/osm-icons/mi-parking.svg'
        )
        expect(fixture.nativeElement.querySelector('.sprite')).not.toBeNull()
        expect(
            fixture.nativeElement
                .querySelector('.vectorIcon')
                .classList.contains('vectorIcon--loaded')
        ).toBe(false)

        image.dispatchEvent(new Event('load'))
        fixture.detectChanges()

        expect(fixture.componentInstance.svgIsLoaded()).toBe(true)
        expect(
            fixture.nativeElement
                .querySelector('.vectorIcon')
                .classList.contains('vectorIcon--loaded')
        ).toBe(true)

        fixture.componentRef.setInput('icon', 'mi-bus-station')
        fixture.detectChanges()

        expect(fixture.componentInstance.svgIsLoaded()).toBe(false)
        expect(image.getAttribute('src')).toBe(
            'assets/osm-icons/mi-bus-station.svg'
        )
        expect(
            fixture.nativeElement.querySelector('.sprite').style
                .backgroundPosition
        ).toBe('-24px 0px')
    })

    it('restores the sprite fallback when the vector asset fails', () => {
        const fixture = TestBed.createComponent(IconComponent)
        fixture.componentRef.setInput('icon', 'mi-parking')
        fixture.componentRef.setInput('renderMode', 'svg')
        fixture.componentRef.setInput('jsonSprites', {
            'mi-parking': {
                x: 0,
                y: 0,
                width: 24,
                height: 36,
                pixelRatio: 1,
            },
        })
        fixture.detectChanges()

        const image = fixture.nativeElement.querySelector(
            '.svgIcon'
        ) as HTMLImageElement
        image.dispatchEvent(new Event('load'))
        fixture.detectChanges()
        expect(fixture.componentInstance.svgIsLoaded()).toBe(true)

        image.dispatchEvent(new Event('error'))
        fixture.detectChanges()

        expect(fixture.componentInstance.svgIsLoaded()).toBe(false)
        expect(fixture.nativeElement.querySelector('.sprite')).not.toBeNull()
    })
})
