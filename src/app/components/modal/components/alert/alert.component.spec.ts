import { HttpClientTestingModule } from '@angular/common/http/testing'
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader'
import { FilterByCountryCode } from '@pipes/filterByCountryCode.pipe'
import { AlertComponent } from './alert.component'

describe('AlertComponent', () => {
    let component: AlertComponent
    let fixture: ComponentFixture<AlertComponent>

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                FilterByCountryCode,
                HttpClientTestingModule,
                TranslateModule.forRoot(),
            ],
            providers: [
                ...provideTranslateHttpLoader({ prefix: './assets/i18n/' }),
            ],
            declarations: [AlertComponent],
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
