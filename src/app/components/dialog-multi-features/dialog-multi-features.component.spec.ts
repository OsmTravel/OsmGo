import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideIonicAngular } from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import { DialogMultiFeaturesComponent } from './dialog-multi-features.component'

describe('DialogMultiFeaturesComponent', () => {
    let component: DialogMultiFeaturesComponent
    let fixture: ComponentFixture<DialogMultiFeaturesComponent>

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [DialogMultiFeaturesComponent, TranslateModule.forRoot()],
            providers: [provideIonicAngular()],
        }).compileComponents()
    }))

    beforeEach(() => {
        fixture = TestBed.createComponent(DialogMultiFeaturesComponent)
        component = fixture.componentInstance
        fixture.componentRef.setInput('features', [])
        fixture.componentRef.setInput('jsonSprites', {})
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
