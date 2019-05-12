import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogIconComponent } from './dialog-icon.component';

describe('DialogIconComponent', () => {
  let component: DialogIconComponent;
  let fixture: ComponentFixture<DialogIconComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogIconComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
