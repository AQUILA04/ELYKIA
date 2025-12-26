import { TestBed } from '@angular/core/testing';

import { LocalityService } from './locality.service';

describe('LocalityService', () => {
  let service: LocalityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
