import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUiLanguageComponent } from './add-ui-language.component';

describe('AddUiLanguageComponent', () => {
  let component: AddUiLanguageComponent;
  let fixture: ComponentFixture<AddUiLanguageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddUiLanguageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddUiLanguageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
