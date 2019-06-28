import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateUiComponent } from './translate-ui.component';

describe('TranslateUiComponent', () => {
  let component: TranslateUiComponent;
  let fixture: ComponentFixture<TranslateUiComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TranslateUiComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TranslateUiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
