import { TestBed } from '@angular/core/testing';

import { AccountingDayService } from './accounting-day.service';

describe('AccountingDayService', () => {
  let service: AccountingDayService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountingDayService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
