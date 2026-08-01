import type { MockedObject } from 'vitest'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { IonicModule } from '@ionic/angular'
import { IonicStorageModule } from '@ionic/storage-angular'
import { HttpClientTestingModule } from '@angular/common/http/testing'

import { ActivatedRoute } from '@angular/router'
import { of } from 'rxjs'

import { BasemapsComponent } from './basemaps.component'
import { BasemapsService } from '@app/services/basemaps.service'
import { TranslateModule, TranslateService } from '@ngx-translate/core'

describe('BasemapsComponent', () => {
    let component: BasemapsComponent
    let fixture: ComponentFixture<BasemapsComponent>
    let basemapsServiceSpy: MockedObject<BasemapsService>

    beforeEach(waitForAsync(() => {
        const basemapsService = {
            getBasemaps: vi.fn().mockName('BasemapsService.getBasemaps'),
        }
        basemapsService.getBasemaps.mockReturnValue(of([]))

        TestBed.configureTestingModule({
            declarations: [BasemapsComponent],
            imports: [
                IonicModule.forRoot(),
                IonicStorageModule.forRoot(),
                HttpClientTestingModule,
                TranslateModule.forRoot(),
            ],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: {
                                get: () => '1',
                            },
                        },
                    },
                },
                { provide: BasemapsService, useValue: basemapsService },
                TranslateService,
            ],
        })
            .overrideComponent(BasemapsComponent, { set: { template: '' } })
            .compileComponents()

        fixture = TestBed.createComponent(BasemapsComponent)
        component = fixture.componentInstance
        basemapsServiceSpy = TestBed.inject(
            BasemapsService
        ) as MockedObject<BasemapsService>
        fixture.detectChanges()
    }))

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
