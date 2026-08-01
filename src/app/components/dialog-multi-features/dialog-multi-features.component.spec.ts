import {
    HttpClientTestingModule,
    HttpTestingController,
} from '@angular/common/http/testing'
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { ModalController, NavParams } from '@ionic/angular'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader'
import { DialogMultiFeaturesComponent } from './dialog-multi-features.component'

export class NavParamsMock {
    static returnParam = null
    public get(key): any {
        if (NavParamsMock.returnParam) {
            return NavParamsMock.returnParam
        }
        return 'default'
    }
    static setParams(value) {
        NavParamsMock.returnParam = value
    }
}

export class ModalControllerMock {
    public create(param1, param2) {
        const rtn: Object = {}
        rtn['present'] = () => true
        return rtn
    }
}

describe('DialogMultiFeaturesComponent', () => {
    let translate: TranslateService
    let http: HttpTestingController
    let component: DialogMultiFeaturesComponent
    let fixture: ComponentFixture<DialogMultiFeaturesComponent>

    beforeEach(waitForAsync(() => {
        NavParamsMock.setParams(null) //set your own params here
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, TranslateModule.forRoot()],
            providers: [
                ...provideTranslateHttpLoader({ prefix: './assets/i18n/' }),
                { provide: NavParams, useClass: NavParamsMock },
                { provide: ModalController, useClass: ModalControllerMock },
            ],

            declarations: [DialogMultiFeaturesComponent],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents()
    }))

    beforeEach(() => {
        fixture = TestBed.createComponent(DialogMultiFeaturesComponent)
        component = fixture.componentInstance
        component.features = []
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
