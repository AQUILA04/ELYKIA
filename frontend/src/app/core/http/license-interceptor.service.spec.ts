import { TestBed } from '@angular/core/testing';

import { LicenseInterceptorService } from './license-interceptor.service';

describe('LicenseInterceptorService', () => {
  let service: LicenseInterceptorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LicenseInterceptorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
