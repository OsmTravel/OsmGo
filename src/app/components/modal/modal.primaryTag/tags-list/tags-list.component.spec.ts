import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TagsListComponent } from './tags-list.component';
import { FilterByTagsContentPipe } from 'src/app/pipes/filterByTagsContent.pipe';
import { FilterTagCongigByGeometryPipe } from 'src/app/pipes/filter-tag-congig-by-geometry.pipe';
import { FilterExcludeKeysPipe } from 'src/app/pipes/filterExcludeKeys.pipe';
import { FilterByCountryCode } from 'src/app/pipes/filterByCountryCode.pipe';
import { FilterExcludeTagByCountryCode } from 'src/app/pipes/filterExcludeTagByCountryCode.pipe';
import { FilterDeprecatedTagPipe } from 'src/app/pipes/filterDeprecatedTag.pipe';
import { DisplayTagsPipe } from 'src/app/pipes/display-tags.pipe';


const tagConfig: any = require('../../../../../assets/tags&presets/tags.json');
const jsonSprites : any = require('../../../../../assets/iconsSprites.json')
describe('TagsListComponent', () => {
  let component: TagsListComponent;
  let fixture: ComponentFixture<TagsListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TagsListComponent, FilterByTagsContentPipe, FilterTagCongigByGeometryPipe , FilterExcludeKeysPipe, 
        FilterByCountryCode, FilterExcludeTagByCountryCode, FilterDeprecatedTagPipe, DisplayTagsPipe],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
  
    // component.processInput();
    fixture = TestBed.createComponent(TagsListComponent);
    component = fixture.componentInstance;
    component.tags = [...tagConfig['shop'].values, ...tagConfig['amenity'].values]

    component.countryTags = 'FR'
    component.languageTags = 'fr'
    component.searchText = ''
    component.oldTagConfig = tagConfig['shop'].values[2];
    component.bookmarks = []
    component.jsonSprites = jsonSprites
    component.geometriesFilter = ['point']

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
