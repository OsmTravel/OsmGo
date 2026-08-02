import { TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { AlertService } from '@services/alert.service'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { MapService } from '@services/map.service'
import { OsmAuthService } from '@services/osm-auth.service'
import { OsmApiService } from '@services/osmApi.service'
import { MenuPage } from './menu'

describe('MenuPage swipes', () => {
    const pointerAt = (clientX: number): PointerEvent =>
        ({ clientX }) as PointerEvent

    const createPage = (): MenuPage =>
        TestBed.runInInjectionContext(() => new MenuPage())

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                { provide: MapService, useValue: {} },
                { provide: OsmApiService, useValue: {} },
                { provide: DataService, useValue: {} },
                { provide: ConfigService, useValue: {} },
                { provide: AlertService, useValue: {} },
                { provide: MatDialog, useValue: {} },
                { provide: TranslateService, useValue: {} },
                { provide: Router, useValue: {} },
                { provide: OsmAuthService, useValue: {} },
            ],
        })
    })

    it('closes the menu after a left swipe', () => {
        const page = createPage()
        vi.spyOn(page, 'closeMenu').mockReturnValue(undefined)

        page.startSwipe(pointerAt(100))
        page.endSwipe(pointerAt(40))

        expect(page.closeMenu).toHaveBeenCalled()
    })

    it('ignores a canceled swipe', () => {
        const page = createPage()
        vi.spyOn(page, 'closeMenu').mockReturnValue(undefined)

        page.startSwipe(pointerAt(100))
        page.cancelSwipe()
        page.endSwipe(pointerAt(40))

        expect(page.closeMenu).not.toHaveBeenCalled()
    })
})
