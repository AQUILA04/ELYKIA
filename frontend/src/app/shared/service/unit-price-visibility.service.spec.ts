import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { UnitPriceVisibilityService } from './unit-price-visibility.service';
import { TokenStorageService } from './token-storage.service';
import { UserService } from 'src/app/user/service/user.service';

describe('UnitPriceVisibilityService', () => {
  let service: UnitPriceVisibilityService;
  let http: HttpTestingController;
  let privileged: boolean;

  const generalUrl = `${environment.apiUrl}/api/parameters/enabled/${UnitPriceVisibilityService.KEY}`;
  const cashUrl = `${environment.apiUrl}/api/parameters/enabled/${UnitPriceVisibilityService.CASH_SALE_KEY}`;

  beforeEach(() => {
    privileged = false;
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: TokenStorageService, useValue: { getToken: () => 'token' } },
        { provide: UserService, useValue: { hasProfile: () => privileged } }
      ]
    });
    service = TestBed.inject(UnitPriceVisibilityService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function load(general: boolean, cash: boolean): void {
    service.refresh(true).subscribe();
    http.expectOne(generalUrl).flush(general);
    http.expectOne(cashUrl).flush(cash);
  }

  it('applies each parameter to its own sale type', () => {
    load(true, false);

    expect(service.snapshot).toBeFalse();
    expect(service.cashSnapshot).toBeTrue();
    expect(service.snapshotFor('CASH')).toBeTrue();
    expect(service.snapshotFor('CREDIT')).toBeFalse();
    expect(service.snapshotFor('TONTINE')).toBeFalse();
    expect(service.snapshotFor(null)).toBeFalse();
  });

  it('hides cash prices when only the cash parameter is on', () => {
    load(false, true);

    expect(service.snapshotFor('CASH')).toBeFalse();
    expect(service.snapshotFor('CREDIT')).toBeTrue();
  });

  it('keeps prices visible for a privileged profile', () => {
    privileged = true;
    load(true, true);

    expect(service.snapshotFor('CASH')).toBeTrue();
    expect(service.snapshotFor('CREDIT')).toBeTrue();
  });

  it('keeps the known value and retries when one read fails', () => {
    load(false, false);

    service.refresh(true).subscribe();
    http.expectOne(generalUrl).flush(true);
    http.expectOne(cashUrl).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.snapshot).toBeFalse();
    expect(service.cashSnapshot).toBeTrue();

    service.ensureLoaded().subscribe();
    http.expectOne(generalUrl).flush(true);
    http.expectOne(cashUrl).flush(true);
    expect(service.cashSnapshot).toBeFalse();
  });

  it('emits the sale-type stream', () => {
    load(false, true);
    let cashShown: boolean | undefined;
    service.showUnitPriceFor$('CASH').subscribe(v => (cashShown = v));
    expect(cashShown).toBeFalse();
  });
});
