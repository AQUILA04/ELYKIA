import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { CustomerActivityAuditService } from './customer-activity-audit.service';

describe('CustomerActivityAuditService', () => {
  let service: CustomerActivityAuditService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/api/v1/customer-activity-logs`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(CustomerActivityAuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search builds filters and unwraps page', () => {
    service
      .search({ category: 'ERROR', eventType: ['HTTP_ERROR', 'APP_ERROR'], phone: '90123456' }, 1, 25)
      .subscribe((page) => {
        expect(page.content.length).toBe(1);
        expect(page.totalElements).toBe(1);
      });

    const req = httpMock.expectOne((r) => r.url === base);
    expect(req.request.params.get('category')).toBe('ERROR');
    expect(req.request.params.get('phone')).toBe('90123456');
    expect(req.request.params.getAll('eventType')).toEqual(['HTTP_ERROR', 'APP_ERROR']);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('25');
    req.flush({
      data: {
        content: [{ id: 1, eventId: 'e1', occurredAt: '2026-09-29T10:00:00Z', eventType: 'HTTP_ERROR' }],
        totalElements: 1,
        totalPages: 1,
        size: 25,
        number: 1,
        first: false,
        last: true,
        empty: false,
        numberOfElements: 1,
        sort: null,
      },
    });
  });

  it('summary hits /summary', () => {
    service.summary({ from: '2026-09-28T00:00:00Z' }).subscribe((s) => {
      expect(s.totalEvents).toBe(10);
      expect(s.errorCount).toBe(2);
    });
    const req = httpMock.expectOne((r) => r.url === `${base}/summary`);
    req.flush({
      data: {
        totalEvents: 10,
        errorCount: 2,
        authFailureCount: 1,
        loginSuccessCount: 5,
        uniqueClients: 3,
        uniqueDevices: 4,
        uniqueSessions: 6,
      },
    });
  });

  it('sessionTimeline hits /sessions/{id}', () => {
    service.sessionTimeline('sess-1').subscribe((rows) => {
      expect(rows.length).toBe(1);
      expect(rows[0].sessionId).toBe('sess-1');
    });
    const req = httpMock.expectOne((r) => r.url === `${base}/sessions/sess-1`);
    req.flush({
      data: [{ id: 1, eventId: 'e1', occurredAt: '2026-09-29T10:00:00Z', sessionId: 'sess-1' }],
    });
  });
});
