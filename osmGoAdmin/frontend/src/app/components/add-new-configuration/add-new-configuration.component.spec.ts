import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddNewConfigurationComponent } from './add-new-configuration.component';

describe('AddNewConfigurationComponent', () => {
  let component: AddNewConfigurationComponent;
  let fixture: ComponentFixture<AddNewConfigurationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddNewConfigurationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddNewConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
