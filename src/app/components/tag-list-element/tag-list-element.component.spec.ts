import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { TagListElementComponent } from './tag-list-element.component'
import { IsBookmarkedPipe } from '../../pipes/is-bookmarked.pipe'
import { DisplayTagsPipe } from '../../pipes/display-tags.pipe'

const tagsConfig: any = require('../../../assets/tagsAndPresets/tags.json')

describe('TagListElementComponent', () => {
    let component: TagListElementComponent
    let fixture: ComponentFixture<TagListElementComponent>

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [
                TagListElementComponent,
                IsBookmarkedPipe,
                DisplayTagsPipe,
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents()
    }))

    beforeEach(() => {
        fixture = TestBed.createComponent(TagListElementComponent)
        component = fixture.componentInstance
        component.tag = tagsConfig.tags[0]
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
