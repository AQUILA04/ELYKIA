import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface WarehousePositionRow {
  id: number | null;
  agencyId: number;
  articleId: number;
  articleCode: string | null;
  articleName: string;
  onHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  shortageQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  creditSalePrice: number;
}

export interface SupplierRestockLine {
  index: number;
  articleId: number;
  articleCode: string | null;
  articleName: string;
  creditRequestedQty: number;
  tontineRequestedQty: number;
  totalRequestedQty: number;
  warehouseOnHandQty: number;
  alreadyReservedForRequestsQty: number;
  warehouseAvailableQty: number;
  quantityToOrder: number;
  unitPurchasePrice: number;
  estimatedTotalCost: number;
  requestReferences: string[];
  requestingCommercials: string[];
}

export interface SupplierRestockOrder {
  agencyId: number;
  agencyName: string;
  activityFilter: string;
  generationDate: string;
  totalArticlesToOrder: number;
  totalUnitsRequested: number;
  totalUnitsToOrder: number;
  totalEstimatedCost: number;
  lines: SupplierRestockLine[];
}

export interface LotLifecycleTrace {
  lotId: number;
  lotCode: string;
  agencyId: number | null;
  parentLotId: number | null;
  articleId: number | null;
  articleCode: string | null;
  articleName: string;
  sourceType: string;
  receptionReference: string | null;
  entryDate: string;
  unitPurchasePrice: number;
  unitSalePrice: number | null;
  initialQuantity: number;
  remainingInThisLot: number;
  totalInWarehouses: number;
  totalWithCommercials: number;
  totalLiquidatedToClients: number;
  totalLostOrAdjusted: number;
  conservationInvariantHolds: boolean;
  childTransferLots: Array<{
    childLotId: number;
    childLotCode: string;
    targetAgencyId: number | null;
    quantityTransferred: number;
    remainingInChildWarehouse: number;
    withCommercialsFromChild: number;
    liquidatedFromChild: number;
    lostOrAdjustedFromChild: number;
  }>;
  commercialAllocations: Array<{
    commercialLayerId: number;
    commercialUsername: string;
    activityType: string;
    quantityAllocated: number;
    quantityRemainingWithCommercial: number;
    unitPurchaseCost: number;
    effectiveSalePrice: number | null;
    acquiredAt: string;
    liquidations: Array<{
      movementId: number;
      movementType: string;
      quantity: number;
      unitPurchaseCost: number;
      unitSalePrice: number | null;
      referenceType: string | null;
      referenceId: number | null;
      referenceCode: string | null;
      accountingDate: string | null;
      performedBy: string | null;
    }>;
  }>;
  directLiquidations: Array<{
    consumptionId: number;
    movementType: string;
    quantity: number;
    unitPurchasePrice: number;
    sourceType: string | null;
    sourceId: number | null;
  }>;
}

export type WarehouseTransferStatus = 'CREATED' | 'VALIDATED' | 'SHIPPED' | 'RECEIVED' | 'CANCELLED';

export interface WarehouseTransferItem {
  id: number;
  articleId: number;
  articleName: string;
  quantityRequested: number;
  quantityShipped: number;
  quantityReceived: number;
  averageUnitCost?: number;
}

export interface WarehouseStockTransfer {
  id: number;
  reference: string;
  sourceAgencyId: number;
  targetAgencyId: number;
  status: WarehouseTransferStatus;
  note?: string;
  createdBy: string;
  createdAt: string;
  validatedBy?: string;
  validatedAt?: string;
  shippedBy?: string;
  shippedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  items: WarehouseTransferItem[];
}

export interface CreateTransferPayload {
  sourceAgencyId: number;
  targetAgencyId: number;
  note?: string;
  items: Array<{ articleId: number; quantity: number }>;
}

@Injectable({
  providedIn: 'root',
})
export class WarehouseStockService {
  private readonly baseUrl = `${environment.apiUrl}/api/v2/warehouse-stocks`;

  constructor(private http: HttpClient) {}

  getPositions(agencyId?: number | null): Observable<WarehousePositionRow[]> {
    let params = new HttpParams();
    if (agencyId != null) {
      params = params.set('agencyId', String(agencyId));
    }
    return this.http
      .get<{ data: WarehousePositionRow[] }>(`${this.baseUrl}/positions`, { params })
      .pipe(map((res) => res?.data ?? []));
  }

  getRestockOrder(agencyId?: number | null, activityType = 'ALL'): Observable<SupplierRestockOrder> {
    let params = new HttpParams().set('activityType', activityType);
    if (agencyId != null) {
      params = params.set('agencyId', String(agencyId));
    }
    return this.http
      .get<{ data: SupplierRestockOrder }>(`${this.baseUrl}/restock-order`, { params })
      .pipe(map((res) => res.data));
  }

  downloadRestockOrderPdf(agencyId?: number | null, activityType = 'ALL'): Observable<Blob> {
    let params = new HttpParams().set('activityType', activityType);
    if (agencyId != null) {
      params = params.set('agencyId', String(agencyId));
    }
    return this.http.get(`${this.baseUrl}/restock-order/pdf`, {
      params,
      responseType: 'blob',
    });
  }

  listLotTraces(agencyId?: number | null, articleId?: number | null): Observable<LotLifecycleTrace[]> {
    let params = new HttpParams();
    if (agencyId != null) {
      params = params.set('agencyId', String(agencyId));
    }
    if (articleId != null) {
      params = params.set('articleId', String(articleId));
    }
    return this.http
      .get<{ data: LotLifecycleTrace[] }>(`${this.baseUrl}/lots/trace`, { params })
      .pipe(map((res) => res?.data ?? []));
  }

  getLotTrace(lotId: number): Observable<LotLifecycleTrace> {
    return this.http
      .get<{ data: LotLifecycleTrace }>(`${this.baseUrl}/lots/${lotId}/trace`)
      .pipe(map((res) => res.data));
  }

  searchTransfers(
    agencyId?: number | null,
    status?: WarehouseTransferStatus | '',
    page = 0,
    size = 20
  ): Observable<{ content: WarehouseStockTransfer[]; totalElements: number }> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (agencyId != null) {
      params = params.set('agencyId', String(agencyId));
    }
    if (status) {
      params = params.set('status', status);
    }
    return this.http
      .get<{ data: { content: WarehouseStockTransfer[]; totalElements?: number; page?: { totalElements: number } } }>(
        `${this.baseUrl}/transfers`,
        { params }
      )
      .pipe(
        map((res) => ({
          content: res?.data?.content ?? [],
          totalElements: res?.data?.page?.totalElements ?? res?.data?.totalElements ?? 0,
        }))
      );
  }

  createTransfer(payload: CreateTransferPayload): Observable<WarehouseStockTransfer> {
    return this.http
      .post<{ data: WarehouseStockTransfer }>(`${this.baseUrl}/transfers`, payload)
      .pipe(map((res) => res.data));
  }

  validateTransfer(transferId: number): Observable<WarehouseStockTransfer> {
    return this.http
      .post<{ data: WarehouseStockTransfer }>(`${this.baseUrl}/transfers/${transferId}/validate`, {})
      .pipe(map((res) => res.data));
  }

  shipTransfer(transferId: number): Observable<WarehouseStockTransfer> {
    return this.http
      .post<{ data: WarehouseStockTransfer }>(`${this.baseUrl}/transfers/${transferId}/ship`, {})
      .pipe(map((res) => res.data));
  }

  receiveTransfer(transferId: number): Observable<WarehouseStockTransfer> {
    return this.http
      .post<{ data: WarehouseStockTransfer }>(`${this.baseUrl}/transfers/${transferId}/receive`, {})
      .pipe(map((res) => res.data));
  }

  cancelTransfer(transferId: number): Observable<WarehouseStockTransfer> {
    return this.http
      .post<{ data: WarehouseStockTransfer }>(`${this.baseUrl}/transfers/${transferId}/cancel`, {})
      .pipe(map((res) => res.data));
  }
}
