import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TranslateModule } from '@ngx-translate/core'
import { TagListElementComponent } from './tag-list-element.component'

const tagsConfig: any = require('../../../assets/tagsAndPresets/tags.json')

describe('TagListElementComponent', () => {
    let component: TagListElementComponent
    let fixture: ComponentFixture<TagListElementComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot(), TagListElementComponent],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents()
    })

    beforeEach(() => {
        fixture = TestBed.createComponent(TagListElementComponent)
        component = fixture.componentInstance
        fixture.componentRef.setInput('tag', tagsConfig.tags[0])
        const sprite = { height: 16, width: 16, x: 0, y: 0 }
        fixture.componentRef.setInput('jsonSprites', {
            [tagsConfig.tags[0].icon]: sprite,
            'wiki-question': sprite,
        })
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
