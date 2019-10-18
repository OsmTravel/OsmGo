import { TestBed } from '@angular/core/testing';

import { StatesService } from './states.service';

describe('StatesService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: StatesService = TestBed.get(StatesService);
    expect(service).toBeTruthy();
  });
});
