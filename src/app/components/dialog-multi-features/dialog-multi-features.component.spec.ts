import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { MatDialogRef } from '@angular/material/dialog'
import { TranslateModule } from '@ngx-translate/core'
import { DialogMultiFeaturesComponent } from './dialog-multi-features.component'

describe('DialogMultiFeaturesComponent', () => {
    let component: DialogMultiFeaturesComponent
    let fixture: ComponentFixture<DialogMultiFeaturesComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DialogMultiFeaturesComponent, TranslateModule.forRoot()],
            providers: [{ provide: MatDialogRef, useValue: {} }],
        }).compileComponents()
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
