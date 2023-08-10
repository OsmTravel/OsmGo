import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import {
    HttpClientTestingModule,
    HttpTestingController,
} from '@angular/common/http/testing'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import {
    TranslateModule,
    TranslateLoader,
    TranslateService,
} from '@ngx-translate/core'
import { Storage } from '@ionic/storage-angular'
import { LoginPage } from './login.component'
import { createTranslateLoader } from '@app/app.module'

import { Location, LocationStrategy } from '@angular/common'
import { ChildrenOutletContexts, UrlSerializer } from '@angular/router'

import { SpyLocation, MockLocationStrategy } from '@angular/common/testing'

const TRANSLATIONS_EN = require('../../../assets/i18n/en.json')
const TRANSLATIONS_FR = require('../../../assets/i18n/fr.json')

const storageIonicMock: any = {
    get: () => new Promise<any>((resolve, reject) => resolve('As2342fAfgsdr')),
    set: (data) => new Promise<any>((resolve, reject) => resolve(data)),
}

describe('LoginComponent', () => {
    let translate: TranslateService
    let http: HttpTestingController

    let component: LoginPage
    let fixture: ComponentFixture<LoginPage>

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
            declarations: [LoginPage],
            providers: [
                UrlSerializer,
                ChildrenOutletContexts,
                { provide: Location, useClass: SpyLocation },
                { provide: LocationStrategy, useClass: MockLocationStrategy },

                {
                    provide: Storage,
                    useValue: storageIonicMock,
                },
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents()
        translate = TestBed.get(TranslateService)
        http = TestBed.get(HttpTestingController)
    }))

    beforeEach(() => {
        fixture = TestBed.createComponent(LoginPage)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
