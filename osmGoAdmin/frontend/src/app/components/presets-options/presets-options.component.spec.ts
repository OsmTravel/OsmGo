import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PresetsOptionsComponent } from './presets-options.component';

describe('PresetsOptionsComponent', () => {
  let component: PresetsOptionsComponent;
  let fixture: ComponentFixture<PresetsOptionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PresetsOptionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PresetsOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
