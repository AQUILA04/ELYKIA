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
  items?: InventoryItemDto[];
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

export interface ApiResponse {
  status: string;
  statusCode: number;
  message: string;
  service: string;
  data: {
    page: any;
    content:any[];
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
    private tokenStorage : TokenStorageService,
  ) {}
  getHeader(){
    const token = this.tokenStorage.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return headers;
  }

  getInventories(page: number, size: number): Observable<ApiResponse> {
    const headers= this.getHeader();
    return this.http.get<ApiResponse>(`${this.apiUrl}?page=${page}&size=${size}`, {headers});
  }
  addInventories(payload: any): Observable<any> {
    const headers= this.getHeader();
    return this.http.patch(`${this.apiUrl}/make-stock-entries`, payload, {headers});
  }
  searchInventories(keyword: string, page: number, size: number): Observable<ApiResponse> {
    const headers = this.getHeader();
    const body = { keyword };

    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.post<ApiResponse>(
      `${this.apiUrl}/elasticsearch`,
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

  getAllInventories(page: number, size: number): Observable<any> {
    const headers = this.getHeader();
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);
    return this.http.get<any>(`${this.inventoryApiUrl}`, { headers, params });
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
