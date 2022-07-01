import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { AlertComponent } from './alert.component'
import { FilterByCountryCode } from 'src/app/pipes/filterByCountryCode.pipe'
import {
    TranslateModule,
    TranslateLoader,
    TranslateService,
} from '@ngx-translate/core'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { HttpClient } from '@angular/common/http'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'

export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json')
}

describe('AlertComponent', () => {
    let component: AlertComponent
    let fixture: ComponentFixture<AlertComponent>

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                TranslateModule.forRoot({
                    loader: {
                        provide: TranslateLoader,
                        useFactory: createTranslateLoader,
                        deps: [HttpClient],
                    },
                }),
            ],
            declarations: [AlertComponent, FilterByCountryCode],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents()
    }))

    beforeEach(() => {
        fixture = TestBed.createComponent(AlertComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
