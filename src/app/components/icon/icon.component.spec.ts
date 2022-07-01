import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { IconComponent } from './icon.component'
const jsonSprites: any = require('../../../assets/iconsSprites@x2.json')
describe('IconComponent', () => {
    let component: IconComponent
    let fixture: ComponentFixture<IconComponent>

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [IconComponent],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents()
    }))

    beforeEach(() => {
        fixture = TestBed.createComponent(IconComponent)
        component = fixture.componentInstance
        component.jsonSprites = jsonSprites
        component.icon = 'maki-bicycle'
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
