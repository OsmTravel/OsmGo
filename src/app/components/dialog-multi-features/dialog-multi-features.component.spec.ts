import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { IonicModule, NavParams } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'
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

describe('DialogMultiFeaturesComponent', () => {
    let component: DialogMultiFeaturesComponent
    let fixture: ComponentFixture<DialogMultiFeaturesComponent>

    beforeEach(waitForAsync(() => {
        NavParamsMock.setParams(null) //set your own params here
        TestBed.configureTestingModule({
            imports: [
                DialogMultiFeaturesComponent,
                IonicModule.forRoot(),
                TranslateModule.forRoot(),
            ],
            providers: [{ provide: NavParams, useClass: NavParamsMock }],
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
