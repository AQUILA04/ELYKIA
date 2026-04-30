import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StockApiService } from './stock-api.service';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { StockRequest } from '../models/stock-request.model';
import { StockReturn } from '../models/stock-return.model';

describe('StockApiService', () => {
  let service: StockApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StockApiService]
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
    it('should call GET /api/stock-requests and return typed response', () => {
      const mockData: StockRequest[] = [{ id: 1, reference: 'STD-2026-01-00000001', status: 'PENDING', createdAt: '2026-01-01' }];
      const mockResponse: ApiResponse<StockRequest[]> = {
        status: 'OK', statusCode: 200, message: 'success', service: 'STOCK-SERVICE', data: mockData
      };

      service.getStandardRequests().subscribe((res) => {
        expect(res.data.length).toBe(1);
        expect(res.data[0].reference).toBe('STD-2026-01-00000001');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/stock-requests`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getTontineRequests', () => {
    it('should call GET /api/v1/stock-tontine-request and return typed response', () => {
      const mockData: StockRequest[] = [{ id: 2, reference: 'TON-2026-01-00000002', status: 'APPROVED', createdAt: '2026-01-02' }];
      const mockResponse: ApiResponse<StockRequest[]> = {
        status: 'OK', statusCode: 200, message: 'success', service: 'STOCK-SERVICE', data: mockData
      };

      service.getTontineRequests().subscribe((res) => {
        expect(res.data.length).toBe(1);
        expect(res.data[0].reference).toBe('TON-2026-01-00000002');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-request`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getStandardReturns', () => {
    it('should call GET /api/stock-returns and return typed response', () => {
      const mockData: StockReturn[] = [{ id: 3, reference: 'RET-2026-01-00000003', status: 'PENDING', createdAt: '2026-01-03' }];
      const mockResponse: ApiResponse<StockReturn[]> = {
        status: 'OK', statusCode: 200, message: 'success', service: 'STOCK-SERVICE', data: mockData
      };

      service.getStandardReturns().subscribe((res) => {
        expect(res.data.length).toBe(1);
        expect(res.data[0].reference).toBe('RET-2026-01-00000003');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/stock-returns`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getTontineReturns', () => {
    it('should call GET /api/v1/stock-tontine-return and return typed response', () => {
      const mockData: StockReturn[] = [{ id: 4, reference: 'TRT-2026-01-00000004', status: 'APPROVED', createdAt: '2026-01-04' }];
      const mockResponse: ApiResponse<StockReturn[]> = {
        status: 'OK', statusCode: 200, message: 'success', service: 'STOCK-SERVICE', data: mockData
      };

      service.getTontineReturns().subscribe((res) => {
        expect(res.data.length).toBe(1);
        expect(res.data[0].reference).toBe('TRT-2026-01-00000004');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/stock-tontine-return`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});
