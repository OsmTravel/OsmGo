import { TestBed, inject } from '@angular/core/testing';

import { TaginfoService } from './taginfo.service';

describe('TaginfoService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TaginfoService]
    });
  });

  it('should be created', inject([TaginfoService], (service: TaginfoService) => {
    expect(service).toBeTruthy();
  }));
});
