import { TestBed } from '@angular/core/testing';

import { CashDeskService } from './cash-desk.service';

describe('CashDeskService', () => {
  let service: CashDeskService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CashDeskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
