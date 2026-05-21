import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StockApiService } from './stock-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

describe('StockApiService', () => {
  let service: StockApiService;
  let httpMock: HttpTestingController;

  const mockAuth = { currentUser: { username: 'commercial1' } };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StockApiService,
        { provide: AuthService, useValue: mockAuth }
      ]
    });
    service = TestBed.inject(StockApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getStandardRequests', () => {
    it('should call GET /api/stock-requests with Spring page params', () => {
      const mockPage = {
        content: [{ id: 1, reference: 'REQ-2026-01-00000001', status: 'CREATED', requestDate: '2026-01-01' }],
        totalElements: 1,
        totalPages: 1,
        size: 100,
        number: 0,
        first: true,
        last: true,
        empty: false,
        numberOfElements: 1
      };

      service.getStandardRequests().subscribe((res) => {
        expect(res.content.length).toBe(1);
        expect(res.content[0].reference).toBe('REQ-2026-01-00000001');
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${environment.apiUrl}/api/stock-requests` && r.params.get('page') === '0' && r.params.get('size') === '100'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockPage);
    });
  });

  describe('createStandardRequest', () => {
    it('should POST StockRequestCreateDto to /create', () => {
      const items = [{ article: { id: 42 }, quantity: 2 }];

      service.createStandardRequest(items).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/stock-requests/create`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        request: { collector: 'commercial1', items },
        forNextMonth: false
      });
      req.flush({ id: 1, status: 'CREATED' });
    });
  });

  describe('createStandardReturn', () => {
    it('should POST StockReturn entity with note (not comment)', () => {
      const items = [{ article: { id: 10 }, quantity: 1 }];

      service.createStandardReturn(items, 'observation').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/stock-returns/create`);
      expect(req.request.body).toEqual({
        collector: 'commercial1',
        items,
        note: 'observation'
      });
      req.flush({ id: 2, status: 'CREATED' });
    });
  });
});
