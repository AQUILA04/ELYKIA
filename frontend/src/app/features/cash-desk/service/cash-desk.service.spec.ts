import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CashDeskService } from './cash-desk.service';
import { TokenStorageService } from '@shared/service/token-storage.service';
import { environment } from '@env/environment';
import { UnifiedRecoveryBatchDto } from '../default-daily-stake-dto';

describe('CashDeskService', () => {
  let service: CashDeskService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CashDeskService,
        { provide: TokenStorageService, useValue: { getToken: () => 'fake-jwt-token' } }
      ]
    });
    service = TestBed.inject(CashDeskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should POST unified recoveries batch to /api/v1/credits/recoveries/batch', () => {
    const payload: UnifiedRecoveryBatchDto = {
      collector: 'COM001',
      source: 'WEB_TFJ_BATCH',
      recoveries: [
        { creditId: 10, clientId: 1, amount: 500, recoveryId: 'TFJ-10-1' },
        { creditId: 11, clientId: 2, amount: 1500, recoveryId: 'TFJ-11-2' }
      ]
    };

    let responseBody: any;
    service.submitUnifiedRecoveries(payload).subscribe((res) => {
      responseBody = res;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/credits/recoveries/batch`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    expect(req.request.body).toEqual(payload);

    req.flush({ data: { successRecoveryIds: ['TFJ-10-1', 'TFJ-11-2'], failedRecoveries: [] } });
    expect(responseBody.data.successRecoveryIds).toEqual(['TFJ-10-1', 'TFJ-11-2']);
  });
});
