import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { WarehouseStockService } from './warehouse-stock.service';

describe('WarehouseStockService', () => {
  let service: WarehouseStockService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WarehouseStockService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(WarehouseStockService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch positions with agencyId filter', () => {
    service.getPositions(2).subscribe((rows) => {
      expect(rows.length).toBe(1);
      expect(rows[0].availableQuantity).toBe(15);
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/v2/warehouse-stocks/positions') && r.params.get('agencyId') === '2');
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [
        {
          id: 1,
          agencyId: 2,
          agencyName: 'Agence Nord',
          articleId: 10,
          articleName: 'TV 32',
          onHandQuantity: 20,
          reservedQuantity: 5,
          availableQuantity: 15,
          shortageQuantity: 0
        }
      ]
    });
  });

  it('should fetch lot traces', () => {
    service.listLotTraces(1, 10).subscribe((traces) => {
      expect(traces.length).toBe(1);
      expect(traces[0].lotCode).toBe('LOT-1');
    });

    const req = httpMock.expectOne((r) =>
      r.url.endsWith('/v2/warehouse-stocks/lots/trace') &&
      r.params.get('agencyId') === '1' &&
      r.params.get('articleId') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [
        {
          lotId: 1,
          lotCode: 'LOT-1',
          agencyId: 1,
          agencyName: 'Siège',
          articleId: 10,
          articleName: 'TV 32',
          initialQuantity: 50,
          remainingWarehouseQuantity: 20,
          transferredOutQuantity: 5,
          allocatedToCommercialsQuantity: 25,
          soldOrDeliveredToClientsQuantity: 15,
          returnedToWarehouseQuantity: 0,
          remainingInCommercialHandsQuantity: 10,
          unitCostPrice: 50000,
          receivedAt: '2026-04-01T10:00:00',
          sourceType: 'RECEPTION',
          fullyLiquidated: false,
          allocations: []
        }
      ]
    });
  });
});
