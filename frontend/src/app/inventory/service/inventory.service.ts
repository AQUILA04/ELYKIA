import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { environment } from 'src/environments/environment';

export interface Inventory {
  id: number;
  name: string;
  marque: string;
  model: string;
  type: string;
  stockQuantity: number | null;
}

export interface InventoryDto {
  id: number;
  inventoryDate: string;
  status: string;
  createdByUser: string;
  completedAt?: string;
  itemCount?: number;
  discrepancyCount?: number;
  items?: InventoryItemDto[];
}

export interface InventorySummaryDto {
  id: number;
  inventoryDate: string;
  status: string;
  createdByUser: string;
  completedAt?: string;
  itemCount: number;
  discrepancyCount: number;
}

export interface InventoryCheckpointDto {
  inventoryId: number;
  inventoryItemId: number;
  inventoryDate: string;
  completedAt?: string;
  anchorAt?: string;
  inventoryStatus: string;
  systemQuantity: number;
  physicalQuantity?: number;
  difference?: number;
  itemStatus: string;
  baselineSystemQuantity: number;
  reconciliationAction?: string;
  markAsDebt?: boolean;
  debtCancelled?: boolean;
}

export interface TrajectorySummaryDto {
  totalIn: number;
  totalOut: number;
  netDelta: number;
  movementCount: number;
  intermediateInventoryCount: number;
}

export interface TimelineNodeDto {
  kind: 'INVENTORY_CHECKPOINT' | 'MOVEMENT';
  occurredAt: string;
  quantityBefore?: number;
  quantityAfter?: number;
  delta?: number;
  gapDetected?: boolean;
  historyId?: number;
  operationType?: string;
  operationUser?: string;
  referenceType?: string;
  referenceId?: number;
  reason?: string;
  inventoryId?: number;
  inventoryItemId?: number;
  systemQuantity?: number;
  physicalQuantity?: number;
  difference?: number;
  itemStatus?: string;
  reconciliationAction?: string;
}

export interface ArticleStockTrajectoryDto {
  articleId: number;
  articleName: string;
  articleMarque?: string;
  articleModel?: string;
  from: InventoryCheckpointDto;
  toDate: string;
  reconstructedQuantity: number;
  currentSystemQuantity: number;
  drift: number;
  summary: TrajectorySummaryDto;
  nodes: TimelineNodeDto[];
}

export interface InventoryItemDto {
  id: number;
  inventoryId: number;
  articleId: number;
  articleName: string;
  articleMarque: string;
  articleModel: string;
  articleType: string;
  systemQuantity: number;
  physicalQuantity?: number;
  difference?: number;
  status: string;
  reconciliationComment?: string;
  reconciledBy?: string;
  reconciledAt?: string;
  markAsDebt: boolean;
  debtCancelled: boolean;
}

export interface PhysicalQuantitySubmission {
  inventoryId: number;
  items: { [articleId: number]: number };
}

export interface ReconciliationRequest {
  inventoryItemId: number;
  comment?: string;
  markAsDebt?: boolean;
  cancelDebt?: boolean;
  action: string;
}

export interface BulkReconciliationRequest {
  inventoryItemIds: number[];
  comment?: string;
  markAsDebt?: boolean;
  cancelDebt?: boolean;
  action: string;
}

export interface ApiResponse {
  status: string;
  statusCode: number;
  message: string;
  service: string;
  data: {
    page: any;
    content: any[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private apiUrl = `${environment.apiUrl}/api/v1/articles`;
  private inventoryApiUrl = `${environment.apiUrl}/api/v1/inventories`;
  private reconciliationApiUrl = `${environment.apiUrl}/api/v1/inventory-reconciliation`;

  constructor(private http: HttpClient,
    private tokenStorage: TokenStorageService,
  ) { }
  getHeader() {
    const token = this.tokenStorage.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return headers;
  }

  getInventories(page: number, size: number): Observable<ApiResponse> {
    const headers = this.getHeader();
    // Utiliser l'endpoint /enabled pour ne récupérer que les articles actifs
    return this.http.get<ApiResponse>(`${this.apiUrl}/enabled?page=${page}&size=${size}`, { headers });
  }

  getEnabledArticles(page: number, size: number): Observable<ApiResponse> {
    const headers = this.getHeader();
    return this.http.get<ApiResponse>(`${this.apiUrl}/enabled?page=${page}&size=${size}`, { headers });
  }
  addInventories(payload: any): Observable<any> {
    const headers = this.getHeader();
    return this.http.patch(`${this.apiUrl}/make-stock-entries`, payload, { headers });
  }
  searchInventories(keyword: string, page: number, size: number): Observable<ApiResponse> {
    const headers = this.getHeader();
    const body = { keyword };

    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    // Utiliser l'endpoint /elasticsearch/enabled pour la recherche filtrée
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/elasticsearch/enabled`,
      body,
      { headers, params }
    );
  }

  // Nouvelles méthodes pour la gestion d'inventaire
  createInventory(): Observable<any> {
    const headers = this.getHeader();
    return this.http.post<any>(`${this.inventoryApiUrl}`, {}, { headers }).pipe(
      map((response: any) => response.data || response)
    );
  }

  getCurrentInventory(): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.inventoryApiUrl}/current`, { headers }).pipe(
      map((response: any) => response.data || response)
    );
  }

  getInventoryById(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.inventoryApiUrl}/${id}`, { headers }).pipe(
      map((response: any) => response.data || response)
    );
  }

  getAllInventories(
    page: number,
    size: number,
    status?: string,
    fromDate?: string,
    toDate?: string
  ): Observable<any> {
    const headers = this.getHeader();
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (status) {
      params = params.set('status', status);
    }
    if (fromDate) {
      params = params.set('fromDate', fromDate);
    }
    if (toDate) {
      params = params.set('toDate', toDate);
    }
    return this.http.get<any>(`${this.inventoryApiUrl}`, { headers, params });
  }

  getItemTrajectory(itemId: number, toDate?: string): Observable<ArticleStockTrajectoryDto> {
    const headers = this.getHeader();
    let params = new HttpParams();
    if (toDate) {
      params = params.set('toDate', toDate);
    }
    return this.http.get<any>(`${this.inventoryApiUrl}/items/${itemId}/trajectory`, { headers, params }).pipe(
      map((response: any) => response.data || response)
    );
  }

  getArticleTrajectory(articleId: number, fromInventoryId: number, toDate?: string): Observable<ArticleStockTrajectoryDto> {
    const headers = this.getHeader();
    let params = new HttpParams().set('fromInventoryId', fromInventoryId);
    if (toDate) {
      params = params.set('toDate', toDate);
    }
    return this.http.get<any>(`${this.apiUrl}/${articleId}/trajectory`, { headers, params }).pipe(
      map((response: any) => response.data || response)
    );
  }

  submitPhysicalQuantities(inventoryId: number, quantities: { [articleId: number]: number }): Observable<any> {
    const headers = this.getHeader();
    const body: PhysicalQuantitySubmission = {
      inventoryId,
      items: quantities
    };
    return this.http.post<any>(`${this.inventoryApiUrl}/${inventoryId}/submit-physical-quantities`, body, { headers }).pipe(
      map((response: any) => response.data || response)
    );
  }

  getInventoryItems(inventoryId: number): Observable<InventoryItemDto[]> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.inventoryApiUrl}/${inventoryId}/items`, { headers }).pipe(
      map((response: any) => response.data || response)
    );
  }

  getDiscrepancies(inventoryId: number): Observable<InventoryItemDto[]> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.inventoryApiUrl}/${inventoryId}/discrepancies`, { headers }).pipe(
      map((response: any) => response.data || response)
    );
  }

  finalizeInventory(inventoryId: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.post<any>(`${this.inventoryApiUrl}/${inventoryId}/finalize`, {}, { headers }).pipe(
      map((response: any) => response.data || response)
    );
  }

  downloadInventoryPdf(inventoryId: number): Observable<Blob> {
    const headers = this.getHeader();
    return this.http.get(`${this.inventoryApiUrl}/${inventoryId}/pdf`, {
      headers,
      responseType: 'blob'
    });
  }

  reconcileItem(reconciliationData: ReconciliationRequest): Observable<any> {
    const headers = this.getHeader();
    return this.http.post<any>(`${this.reconciliationApiUrl}/reconcile`, reconciliationData, { headers }).pipe(
      map((response: any) => response.data || response)
    );
  }

  bulkReconcile(bulkData: BulkReconciliationRequest): Observable<any> {
    const headers = this.getHeader();
    return this.http.post<any>(`${this.reconciliationApiUrl}/bulk-reconcile`, bulkData, { headers }).pipe(
      map((response: any) => response.data || response)
    );
  }

  getReconciliationHistory(inventoryItemId: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.reconciliationApiUrl}/history/${inventoryItemId}`, { headers }).pipe(
      map((response: any) => response.data || response)
    );
  }

  checkForInputErrors(inventoryItemId: number, startDate: string, endDate: string): Observable<any> {
    const headers = this.getHeader();
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<any>(`${this.reconciliationApiUrl}/check-errors/${inventoryItemId}`, { headers, params }).pipe(
      map((response: any) => response.data || response)
    );
  }
}
