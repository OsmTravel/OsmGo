import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TagListElementComponent } from './tag-list-element.component'

const tagsConfig: any = require('../../../assets/tagsAndPresets/tags.json')

describe('TagListElementComponent', () => {
    let component: TagListElementComponent
    let fixture: ComponentFixture<TagListElementComponent>

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [TagListElementComponent],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents()
    }))

    beforeEach(() => {
        fixture = TestBed.createComponent(TagListElementComponent)
        component = fixture.componentInstance
        component.tag = tagsConfig.tags[0]
        const sprite = { height: 16, width: 16, x: 0, y: 0 }
        component.jsonSprites = {
            [component.tag.icon]: sprite,
            'wiki-question': sprite,
        }
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
