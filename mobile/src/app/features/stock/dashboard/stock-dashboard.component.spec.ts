import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SegmentCustomEvent } from '@ionic/angular';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { take } from 'rxjs/operators';

import { StockDashboardComponent } from './stock-dashboard.component';
import { StockStateService } from '../services/stock-state.service';
import { StockApiService } from '../services/stock-api.service';
import { RequestListComponent } from '../components/request-list/request-list.component';
import { StockReturnListComponent } from '../components/return-list/stock-return-list.component';
import { StockStatusPipe } from '../pipes/stock-status.pipe';
import { environment } from '../../../../environments/environment';

describe('StockDashboardComponent', () => {
    let component: StockDashboardComponent;
    let fixture: ComponentFixture<StockDashboardComponent>;
    let stockStateService: StockStateService;
    let httpMock: HttpTestingController;

    const expectUrl = (path: string) => httpMock.expectOne((req) => req.url === `${environment.apiUrl}${path}`);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            declarations: [
                StockDashboardComponent,
                RequestListComponent,
                StockReturnListComponent,
                StockStatusPipe,
            ],
            imports: [CommonModule],
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                StockStateService,
                StockApiService,
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(StockDashboardComponent);
        component = fixture.componentInstance;
        stockStateService = TestBed.inject(StockStateService);
        httpMock = TestBed.inject(HttpTestingController);
        fixture.detectChanges();

        // Flush initial context-triggered requests (STANDARD by default)
        expectUrl('/api/stock-requests').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });
        expectUrl('/api/stock-returns').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });
    });

    afterEach(() => {
        fixture?.destroy();
        httpMock?.verify();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should expose context$ Observable bound to StockStateService', async () => {
        component.context$.pipe(take(1)).subscribe(ctx => {
            expect(ctx).toBe('STANDARD');
        });
    });

    it('should reset context to STANDARD on init', async () => {
        stockStateService.setContext('TONTINE');
        expectUrl('/api/v1/stock-tontine-request').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });
        expectUrl('/api/v1/stock-tontine-return').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });

        component.ngOnDestroy();
        const freshFixture = TestBed.createComponent(StockDashboardComponent);
        freshFixture.detectChanges();
        expectUrl('/api/stock-requests').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });
        expectUrl('/api/stock-returns').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });
        freshFixture.destroy();

        stockStateService.context$.pipe(take(1)).subscribe(ctx => {
            expect(ctx).toBe('STANDARD');
        });
    });

    it('should call stockStateService.setContext with TONTINE when Tontine pill is clicked', async () => {
        const tontinePill = fixture.debugElement.query(By.css('#ctx-pill-tontine'));
        tontinePill.triggerEventHandler('click', null);

        expectUrl('/api/v1/stock-tontine-request').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });
        expectUrl('/api/v1/stock-tontine-return').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });

        stockStateService.context$.pipe(take(1)).subscribe(ctx => {
            expect(ctx).toBe('TONTINE');
        });
    });

    it('should call stockStateService.setContext with STANDARD when Standard pill is clicked', async () => {
        const tontinePill = fixture.debugElement.query(By.css('#ctx-pill-tontine'));
        tontinePill.triggerEventHandler('click', null);
        expectUrl('/api/v1/stock-tontine-request').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });
        expectUrl('/api/v1/stock-tontine-return').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });

        const standardPill = fixture.debugElement.query(By.css('#ctx-pill-standard'));
        standardPill.triggerEventHandler('click', null);
        expectUrl('/api/stock-requests').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });
        expectUrl('/api/stock-returns').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });

        stockStateService.context$.pipe(take(1)).subscribe(ctx => {
            expect(ctx).toBe('STANDARD');
        });
    });

    it('should reflect context changes from service in context$ Observable', async () => {
        stockStateService.setContext('TONTINE');
        expectUrl('/api/v1/stock-tontine-request').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });
        expectUrl('/api/v1/stock-tontine-return').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });

        component.context$.pipe(take(1)).subscribe(ctx => {
            expect(ctx).toBe('TONTINE');
        });
    });

    // ── AC1: Returns endpoint integration tests ────────────────────────────────

    describe('AC1 — Returns API integration', () => {
        it('should call getStandardReturns() when context is STANDARD', () => {
            // Context is already STANDARD from beforeEach — returns already loaded
            expect(component.returns).toEqual([]);
        });

        it('should call getTontineReturns() when context switches to TONTINE', () => {
            stockStateService.setContext('TONTINE');

            expectUrl('/api/v1/stock-tontine-request').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });
            const retReq = expectUrl('/api/v1/stock-tontine-return');
            expect(retReq.request.method).toBe('GET');

            const mockReturns = [{ id: 1, reference: 'RET-2026-01-00000001', status: 'PENDING', createdAt: '2026-01-01' }];
            retReq.flush({ content: mockReturns, totalElements: 1, totalPages: 1, size: 100, number: 0, first: true, last: true, empty: false, numberOfElements: 1 });

            expect(component.returns).toEqual(mockReturns);
        });

        it('should populate returns[] after a successful STANDARD returns API response', () => {
            // Re-trigger STANDARD fetch by toggling to TONTINE then back to STANDARD
            stockStateService.setContext('TONTINE');
            expectUrl('/api/v1/stock-tontine-request').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });
            expectUrl('/api/v1/stock-tontine-return').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });

            stockStateService.setContext('STANDARD');
            expectUrl('/api/stock-requests').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });

            const mockReturns = [{ id: 5, reference: 'RET-STD', status: 'APPROVED', createdAt: '2026-01-05' }];
            expectUrl('/api/stock-returns').flush({ content: mockReturns, totalElements: 1, totalPages: 1, size: 100, number: 0, first: true, last: true, empty: false, numberOfElements: 1 });

            expect(component.returns).toEqual(mockReturns);
            expect(component.returnsLoading).toBe(false);
        });

        it('should set returnsLoading=false and returns=[] on returns API error', () => {
            stockStateService.setContext('TONTINE');
            expectUrl('/api/v1/stock-tontine-request').flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true, numberOfElements: 0 });
            expectUrl('/api/v1/stock-tontine-return').error(new ProgressEvent('error'));

            expect(component.returnsLoading).toBe(false);
            expect(component.returns).toEqual([]);
        });
    });

    // ── Tab switching ──────────────────────────────────────────────────────────

    describe('Tab switching', () => {
        it('should default to requests tab', () => {
            expect(component.activeTab).toBe('requests');
        });

        it('should switch activeTab to returns when returns tab button is clicked', () => {
            const returnsTabBtn = fixture.debugElement.query(By.css('#tab-btn-returns'));
            returnsTabBtn.triggerEventHandler('click', null);
            expect(component.activeTab).toBe('returns');
        });

        it('should switch activeTab back to requests from returns', () => {
            component.activeTab = 'returns';
            const requestsTabBtn = fixture.debugElement.query(By.css('#tab-btn-requests'));
            requestsTabBtn.triggerEventHandler('click', null);
            expect(component.activeTab).toBe('requests');
        });
    });
});


