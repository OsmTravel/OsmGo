import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingPkeyComponent } from './setting-pkey.component';

describe('SettingPkeyComponent', () => {
  let component: SettingPkeyComponent;
  let fixture: ComponentFixture<SettingPkeyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SettingPkeyComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingPkeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
