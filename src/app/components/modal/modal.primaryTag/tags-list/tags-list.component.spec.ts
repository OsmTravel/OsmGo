import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TagsListComponent } from './tags-list.component';
import { FilterByTagsContentPipe } from 'src/app/pipes/filterByTagsContent.pipe';
import { FilterTagCongigByGeometryPipe } from 'src/app/pipes/filter-tag-congig-by-geometry.pipe';
import { FilterExcludeKeysPipe } from 'src/app/pipes/filterExcludeKeys.pipe';
import { FilterByCountryCode } from 'src/app/pipes/filterByCountryCode.pipe';
import { FilterExcludeTagByCountryCode } from 'src/app/pipes/filterExcludeTagByCountryCode.pipe';
import { FilterDeprecatedTagPipe } from 'src/app/pipes/filterDeprecatedTag.pipe';
import { FilterBySearchablePipe } from 'src/app/pipes/filter-by-searchable.pipe'

import { DisplayTagsPipe } from 'src/app/pipes/display-tags.pipe';
import { IsBookmarkedPipe } from 'src/app/pipes/is-bookmarked.pipe';

const tagConfig: any = require('../../../../../assets/tags&presets/tags.json');
const jsonSprites : any = require('../../../../../assets/iconsSprites@x2.json')
describe('TagsListComponent', () => {
  let component: TagsListComponent;
  let fixture: ComponentFixture<TagsListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TagsListComponent, FilterByTagsContentPipe, FilterTagCongigByGeometryPipe , FilterExcludeKeysPipe, 
        FilterByCountryCode, FilterExcludeTagByCountryCode, FilterDeprecatedTagPipe, FilterBySearchablePipe,  DisplayTagsPipe, IsBookmarkedPipe],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
  
    // component.processInput();
    fixture = TestBed.createComponent(TagsListComponent);
    component = fixture.componentInstance;
    component.tags = tagConfig.tags;

    component.countryTags = 'FR'
    component.languageTags = 'fr'
    component.searchText = ''
    component.oldTagConfig = tagConfig.tags[2];
    component.bookmarksIds = ['advertising/billboard', 'shop/bakery']
    component.jsonSprites = jsonSprites
    component.geometriesFilter = ['point']

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
