import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  StockRequest,
  StockRequestItemPayload,
  StockRequestCreateDto,
  CreateStockRequestPayload
} from '../models/stock-request.model';
import {
  StockReturn,
  StockReturnCreateBody,
  CreateStockReturnPayload,
  StockReturnItemPayload
} from '../models/stock-return.model';
import { CreateTontineRequestPayload, StockTontineRequest } from '../models/stock-tontine-request.model';
import { CreateTontineReturnPayload, StockTontineReturn } from '../models/stock-tontine-return.model';
import { StockPage } from '../models/stock-page.model';

@Injectable({
  providedIn: 'root'
})
export class StockApiService {
  private readonly baseUrl = environment.apiUrl;
  private readonly defaultListSize = 100;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getStandardRequests(page = 0, size = this.defaultListSize): Observable<StockPage<StockRequest>> {
    return this.http.get<StockPage<StockRequest>>(`${this.baseUrl}/api/stock-requests`, {
      params: this.pageParams(page, size)
    });
  }

  getTontineRequests(page = 0, size = this.defaultListSize): Observable<StockPage<StockTontineRequest>> {
    return this.http.get<StockPage<StockTontineRequest>>(`${this.baseUrl}/api/v1/stock-tontine-request`, {
      params: this.pageParams(page, size)
    });
  }

  getStandardReturns(page = 0, size = this.defaultListSize): Observable<StockPage<StockReturn>> {
    return this.http.get<StockPage<StockReturn>>(`${this.baseUrl}/api/stock-returns`, {
      params: this.pageParams(page, size)
    });
  }

  getTontineReturns(page = 0, size = this.defaultListSize): Observable<StockPage<StockTontineReturn>> {
    return this.http.get<StockPage<StockTontineReturn>>(`${this.baseUrl}/api/v1/stock-tontine-return`, {
      params: this.pageParams(page, size)
    });
  }

  /**
   * POST /api/stock-requests/create
   * Backend : StockRequestCreateDto { request, forNextMonth }
   */
  createStandardRequest(
    payload: CreateStockRequestPayload | StockRequestItemPayload[],
    forNextMonth = false
  ): Observable<StockRequest> {
    const items = Array.isArray(payload) ? payload : payload.items;
    const nextMonth = Array.isArray(payload) ? forNextMonth : (payload.forNextMonth ?? forNextMonth);
    const body: StockRequestCreateDto = {
      request: {
        collector: this.currentCollector(),
        items
      },
      forNextMonth: nextMonth
    };
    return this.http.post<StockRequest>(`${this.baseUrl}/api/stock-requests/create`, body);
  }

  /**
   * POST /api/stock-returns/create
   * Backend : entité StockReturn (items + collector + note)
   */
  createStandardReturn(payload: CreateStockReturnPayload | StockReturnItemPayload[], note?: string): Observable<StockReturn> {
    const items = Array.isArray(payload) ? payload : payload.items;
    const noteValue = Array.isArray(payload) ? note : (payload.comment?.trim() || note);
    const body: StockReturnCreateBody = {
      collector: this.currentCollector(),
      items,
      note: noteValue?.trim() || undefined
    };
    return this.http.post<StockReturn>(`${this.baseUrl}/api/stock-returns/create`, body);
  }

  /** POST /api/v1/stock-tontine-request/create — corps : StockTontineRequest */
  createTontineRequest(payload: CreateTontineRequestPayload): Observable<StockTontineRequest> {
    const body: CreateTontineRequestPayload = {
      ...payload,
      collector: payload.collector ?? this.currentCollector(),
      items: payload.items
    };
    return this.http.post<StockTontineRequest>(`${this.baseUrl}/api/v1/stock-tontine-request/create`, body);
  }

  /** POST /api/v1/stock-tontine-return/create — corps : StockTontineReturn */
  createTontineReturn(payload: CreateTontineReturnPayload): Observable<StockTontineReturn> {
    const body: CreateTontineReturnPayload = {
      ...payload,
      collector: payload.collector ?? this.currentCollector(),
      items: payload.items
    };
    return this.http.post<StockTontineReturn>(`${this.baseUrl}/api/v1/stock-tontine-return/create`, body);
  }

  cancelStandardRequest(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/stock-requests/${id}/cancel`, {});
  }

  getStandardRequestById(id: number): Observable<StockRequest> {
    return this.http.get<StockRequest>(`${this.baseUrl}/api/stock-requests/${id}`);
  }

  getStandardReturnById(id: number): Observable<StockReturn> {
    return this.http.get<StockReturn>(`${this.baseUrl}/api/stock-returns/${id}`);
  }

  getTontineRequestById(id: number): Observable<StockTontineRequest> {
    return this.http.get<StockTontineRequest>(`${this.baseUrl}/api/v1/stock-tontine-request/${id}`);
  }

  getTontineReturnById(id: number): Observable<StockTontineReturn> {
    return this.http.get<StockTontineReturn>(`${this.baseUrl}/api/v1/stock-tontine-return/${id}`);
  }

  cancelStandardReturn(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/stock-returns/${id}/cancel`, {});
  }

  cancelTontineRequest(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/v1/stock-tontine-request/${id}/cancel`, {});
  }

  cancelTontineReturn(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/v1/stock-tontine-return/${id}/cancel`, {});
  }

  private pageParams(page: number, size: number): HttpParams {
    return new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
  }

  private currentCollector(): string | undefined {
    return this.authService.currentUser?.username;
  }
}
