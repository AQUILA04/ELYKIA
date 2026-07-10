import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CustomerCheckPhoneRequest,
  CustomerCheckPhoneResponse,
  CustomerLoginRequest,
  CustomerLoginResponse,
  CustomerSetupPinRequest,
} from '../models/customer-auth.model';
import {
  CustomerDashboard,
  CustomerPurchase,
  CustomerRecovery,
  MobileMoneyPaymentRequest,
  MobileMoneyRecipient,
  CustomerArticle,
  CustomerArticleType,
  OrderRequest,
  OrderResponse,
  CustomerTontineContributionSummary,
  CustomerTontineContributionDetail,
  CustomerTontinePaymentPage,
} from '../models/customer.model';

/**
 * Service API centralisé — Espace Client ELYKIA.
 * Tous les endpoints sont préfixés par /api/customer/.
 */
@Injectable({ providedIn: 'root' })
export class CustomerApiService {

  private readonly base = `${environment.apiUrl}/api/customer`;

  constructor(private http: HttpClient) {}

  // ─── AUTH ────────────────────────────────────────────────────────────────

  checkPhone(payload: CustomerCheckPhoneRequest): Observable<CustomerCheckPhoneResponse> {
    return this.http.post<CustomerCheckPhoneResponse>(`${this.base}/auth/check-phone`, payload);
  }

  login(payload: CustomerLoginRequest): Observable<CustomerLoginResponse> {
    return this.http.post<CustomerLoginResponse>(`${this.base}/auth/login`, payload);
  }

  setupPin(payload: CustomerSetupPinRequest): Observable<CustomerLoginResponse> {
    return this.http.post<CustomerLoginResponse>(`${this.base}/auth/setup-pin`, payload);
  }

  // ─── DASHBOARD ───────────────────────────────────────────────────────────

  getDashboard(): Observable<CustomerDashboard> {
    return this.http.get<CustomerDashboard>(`${this.base}/dashboard`);
  }

  // ─── ACHATS ──────────────────────────────────────────────────────────────

  getPurchases(): Observable<CustomerPurchase[]> {
    return this.http.get<CustomerPurchase[]>(`${this.base}/purchases`);
  }

  getPurchaseById(id: string): Observable<CustomerPurchase> {
    return this.http.get<CustomerPurchase>(`${this.base}/purchases/${id}`);
  }

  // ─── RECOUVREMENTS ───────────────────────────────────────────────────────

  getRecoveries(distributionId: string): Observable<CustomerRecovery[]> {
    return this.http.get<CustomerRecovery[]>(`${this.base}/purchases/${distributionId}/recoveries`);
  }

  getMobileMoneyRecipients(distributionId: string): Observable<MobileMoneyRecipient> {
    return this.http.get<MobileMoneyRecipient>(`${this.base}/purchases/${distributionId}/mobile-money-recipients`);
  }

  submitMobileMoneyPayment(payload: MobileMoneyPaymentRequest): Observable<CustomerRecovery> {
    return this.http.post<CustomerRecovery>(`${this.base}/recoveries/mobile-money`, payload);
  }

  // ─── TONTINE ──────────────────────────────────────────────────────────────

  getTontineContributions(): Observable<CustomerTontineContributionSummary[]> {
    return this.http.get<CustomerTontineContributionSummary[]>(`${this.base}/tontine/contributions`);
  }

  getTontineContributionById(memberId: string): Observable<CustomerTontineContributionDetail> {
    return this.http.get<CustomerTontineContributionDetail>(`${this.base}/tontine/contributions/${memberId}`);
  }

  getTontinePayments(memberId: string, page = 0, size = 50): Observable<CustomerTontinePaymentPage> {
    return this.http.get<CustomerTontinePaymentPage>(
      `${this.base}/tontine/contributions/${memberId}/payments`,
      {
        params: { page: String(page), size: String(size) },
      },
    );
  }

  // ─── CATALOGUE & COMMANDES ───────────────────────────────────────────────

  getArticles(search?: string, category?: string): Observable<CustomerArticle[]> {
    const params: Record<string, string> = {};
    if (search)   params['search'] = search;
    if (category) params['category'] = category;
    return this.http.get<CustomerArticle[]>(`${this.base}/articles`, { params });
  }

  getTopArticleTypes(limit = 10): Observable<CustomerArticleType[]> {
    return this.http.get<CustomerArticleType[]>(`${this.base}/articles/top-types`, {
      params: { limit: String(limit) },
    });
  }

  submitOrder(payload: OrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.base}/orders`, payload);
  }

  getOrders(): Observable<CustomerPurchase[]> {
    return this.http.get<CustomerPurchase[]>(`${this.base}/orders`);
  }
}
