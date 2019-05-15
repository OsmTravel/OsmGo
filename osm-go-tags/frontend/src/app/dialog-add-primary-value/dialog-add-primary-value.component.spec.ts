import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAddPrimaryValueComponent } from './dialog-add-primary-value.component';

describe('DialogAddPrimaryValueComponent', () => {
  let component: DialogAddPrimaryValueComponent;
  let fixture: ComponentFixture<DialogAddPrimaryValueComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogAddPrimaryValueComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogAddPrimaryValueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
