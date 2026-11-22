import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@env/environment';
import { UnitPriceVisibilityService } from './unit-price-visibility.service';
import { TokenStorageService } from './token-storage.service';
import { UserService } from '@features/user/service/user.service';

describe('UnitPriceVisibilityService', () => {
    let service: UnitPriceVisibilityService;
    let http: HttpTestingController;
    let privileged: boolean;

    const generalUrl = `${environment.apiUrl}/api/parameters/enabled/${UnitPriceVisibilityService.KEY}`;
    const cashUrl = `${environment.apiUrl}/api/parameters/enabled/${UnitPriceVisibilityService.CASH_SALE_KEY}`;

    beforeEach(() => {
        privileged = false;
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
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

        expect(service.snapshot).toBe(false);
        expect(service.cashSnapshot).toBe(true);
        expect(service.snapshotFor('CASH')).toBe(true);
        expect(service.snapshotFor('CREDIT')).toBe(false);
        expect(service.snapshotFor('TONTINE')).toBe(false);
        expect(service.snapshotFor(null)).toBe(false);
    });

    it('hides cash prices when only the cash parameter is on', () => {
        load(false, true);

        expect(service.snapshotFor('CASH')).toBe(false);
        expect(service.snapshotFor('CREDIT')).toBe(true);
    });

    it('keeps prices visible for a privileged profile', () => {
        privileged = true;
        load(true, true);

        expect(service.snapshotFor('CASH')).toBe(true);
        expect(service.snapshotFor('CREDIT')).toBe(true);
    });

    it('keeps the known value and retries when one read fails', () => {
        load(false, false);

        service.refresh(true).subscribe();
        http.expectOne(generalUrl).flush(true);
        http.expectOne(cashUrl).flush('boom', { status: 500, statusText: 'Server Error' });

        expect(service.snapshot).toBe(false);
        expect(service.cashSnapshot).toBe(true);

        service.ensureLoaded().subscribe();
        http.expectOne(generalUrl).flush(true);
        http.expectOne(cashUrl).flush(true);
        expect(service.cashSnapshot).toBe(false);
    });

    it('emits the sale-type stream', () => {
        load(false, true);
        let cashShown: boolean | undefined;
        service.showUnitPriceFor$('CASH').subscribe(v => (cashShown = v));
        expect(cashShown).toBe(false);
    });
});
