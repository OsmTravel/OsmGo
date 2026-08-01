import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import {
    TranslateLoader,
    TranslateModule,
    TranslateService,
} from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { FilterByCountryCode } from '@pipes/filterByCountryCode.pipe'
import { AlertComponent } from './alert.component'

export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json')
}

describe('AlertComponent', () => {
    let component: AlertComponent
    let fixture: ComponentFixture<AlertComponent>

    beforeEach(waitForAsync(() => {
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
