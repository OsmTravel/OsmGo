import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { IonicModule } from '@ionic/angular'

import { BasemapsComponent } from './basemaps.component'

describe('BasemapsComponent', () => {
    let component: BasemapsComponent
    let fixture: ComponentFixture<BasemapsComponent>

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [BasemapsComponent],
            imports: [IonicModule.forRoot()],
        }).compileComponents()

        fixture = TestBed.createComponent(BasemapsComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    }))

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
