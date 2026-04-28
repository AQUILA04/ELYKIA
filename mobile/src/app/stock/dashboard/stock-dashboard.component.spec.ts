import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, SegmentCustomEvent } from '@ionic/angular';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { take } from 'rxjs/operators';

import { StockDashboardComponent } from './stock-dashboard.component';
import { StockStateService } from '../services/stock-state.service';
import { StockApiService } from '../services/stock-api.service';
import { RequestListComponent } from '../components/request-list/request-list.component';
import { StockReturnListComponent } from '../components/return-list/stock-return-list.component';
import { environment } from '../../../environments/environment';

describe('StockDashboardComponent', () => {
  let component: StockDashboardComponent;
  let fixture: ComponentFixture<StockDashboardComponent>;
  let stockStateService: StockStateService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        StockDashboardComponent,
        RequestListComponent,
        StockReturnListComponent
      ],
      imports: [IonicModule.forRoot(), HttpClientTestingModule],
      providers: [StockStateService, StockApiService]
    }).compileComponents();

    fixture = TestBed.createComponent(StockDashboardComponent);
    component = fixture.componentInstance;
    stockStateService = TestBed.inject(StockStateService);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    // Flush initial context-triggered requests (STANDARD by default)
    httpMock.expectOne(`${environment.apiUrl}/api/stock-requests`).flush({ data: [] });
    httpMock.expectOne(`${environment.apiUrl}/api/stock-returns`).flush({ data: [] });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose context$ Observable bound to StockStateService', (done) => {
    component.context$.pipe(take(1)).subscribe(ctx => {
      expect(ctx).toBe('STANDARD');
      done();
    });
  });

  it('should reset context to STANDARD on init', (done) => {
    stockStateService.setContext('TONTINE');
    // Flush the context-change triggered calls
    httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-request`).flush({ data: [] });
    httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-return`).flush({ data: [] });

    component.ngOnInit();
    // ngOnInit resets to STANDARD → new HTTP calls
    httpMock.expectOne(`${environment.apiUrl}/api/stock-requests`).flush({ data: [] });
    httpMock.expectOne(`${environment.apiUrl}/api/stock-returns`).flush({ data: [] });

    stockStateService.context$.pipe(take(1)).subscribe(ctx => {
      expect(ctx).toBe('STANDARD');
      done();
    });
  });

  it('should call stockStateService.setContext with TONTINE when ion-segment fires ionChange with TONTINE', (done) => {
    const segmentElement = fixture.debugElement.query(By.css('#stock-context-segment'));
    const mockEvent = { detail: { value: 'TONTINE' } } as unknown as SegmentCustomEvent;
    segmentElement.triggerEventHandler('ionChange', mockEvent);

    // Flush the context-change triggered HTTP calls
    httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-request`).flush({ data: [] });
    httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-return`).flush({ data: [] });

    stockStateService.context$.pipe(take(1)).subscribe(ctx => {
      expect(ctx).toBe('TONTINE');
      done();
    });
  });

  it('should call stockStateService.setContext with STANDARD when ion-segment fires ionChange with STANDARD', (done) => {
    const segmentElement = fixture.debugElement.query(By.css('#stock-context-segment'));
    segmentElement.triggerEventHandler('ionChange', { detail: { value: 'TONTINE' } } as unknown as SegmentCustomEvent);
    httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-request`).flush({ data: [] });
    httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-return`).flush({ data: [] });

    segmentElement.triggerEventHandler('ionChange', { detail: { value: 'STANDARD' } } as unknown as SegmentCustomEvent);
    httpMock.expectOne(`${environment.apiUrl}/api/stock-requests`).flush({ data: [] });
    httpMock.expectOne(`${environment.apiUrl}/api/stock-returns`).flush({ data: [] });

    stockStateService.context$.pipe(take(1)).subscribe(ctx => {
      expect(ctx).toBe('STANDARD');
      done();
    });
  });

  it('should reflect context changes from service in context$ Observable', (done) => {
    stockStateService.setContext('TONTINE');
    httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-request`).flush({ data: [] });
    httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-return`).flush({ data: [] });

    component.context$.pipe(take(1)).subscribe(ctx => {
      expect(ctx).toBe('TONTINE');
      done();
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

      httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-request`).flush({ data: [] });
      const retReq = httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-return`);
      expect(retReq.request.method).toBe('GET');

      const mockReturns = [{ id: 1, reference: 'RET-2026-01-00000001', status: 'PENDING', createdAt: '2026-01-01' }];
      retReq.flush({ data: mockReturns });

      expect(component.returns).toEqual(mockReturns);
    });

    it('should populate returns[] after a successful STANDARD returns API response', () => {
      // Re-trigger STANDARD fetch by toggling to TONTINE then back to STANDARD
      stockStateService.setContext('TONTINE');
      httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-request`).flush({ data: [] });
      httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-return`).flush({ data: [] });

      stockStateService.setContext('STANDARD');
      httpMock.expectOne(`${environment.apiUrl}/api/stock-requests`).flush({ data: [] });

      const mockReturns = [{ id: 5, reference: 'RET-STD', status: 'APPROVED', createdAt: '2026-01-05' }];
      httpMock.expectOne(`${environment.apiUrl}/api/stock-returns`).flush({ data: mockReturns });

      expect(component.returns).toEqual(mockReturns);
      expect(component.returnsLoading).toBeFalse();
    });

    it('should set returnsLoading=false and returns=[] on returns API error', () => {
      stockStateService.setContext('TONTINE');
      httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-request`).flush({ data: [] });
      httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-return`).error(new ErrorEvent('network error'));

      expect(component.returnsLoading).toBeFalse();
      expect(component.returns).toEqual([]);
    });
  });

  // ── Tab switching ──────────────────────────────────────────────────────────

  describe('Tab switching', () => {
    it('should default to requests tab', () => {
      expect(component.activeTab).toBe('requests');
    });

    it('should switch activeTab to returns when tab segment fires returns', () => {
      const tabSegment = fixture.debugElement.query(By.css('#stock-content-tab-segment'));
      tabSegment.triggerEventHandler('ionChange', { detail: { value: 'returns' } } as unknown as SegmentCustomEvent);
      expect(component.activeTab).toBe('returns');
    });

    it('should switch activeTab back to requests from returns', () => {
      component.activeTab = 'returns';
      const tabSegment = fixture.debugElement.query(By.css('#stock-content-tab-segment'));
      tabSegment.triggerEventHandler('ionChange', { detail: { value: 'requests' } } as unknown as SegmentCustomEvent);
      expect(component.activeTab).toBe('requests');
    });
  });
});


