import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CustomerLoginRequest, CustomerLoginResponse } from '../models/customer-auth.model';
import {
  CustomerDashboard,
  CustomerPurchase,
  CustomerRecovery,
  MobileMoneyPaymentRequest,
  CustomerArticle,
  OrderRequest,
  OrderResponse,
} from '../models/customer.model';

/**
 * Service API centralisé — Espace Client ELYKIA.
 * Tous les endpoints sont préfixés par /api/customer/.
 * Le token JWT client est injecté automatiquement via CustomerAuthInterceptor.
 *
 * @author Francis AHONSU
 */
@Injectable({ providedIn: 'root' })
export class CustomerApiService {

  private readonly base = `${environment.apiUrl}/api/customer`;

  constructor(private http: HttpClient) {}

  // ─── AUTH ────────────────────────────────────────────────────────────────

  login(payload: CustomerLoginRequest): Observable<CustomerLoginResponse> {
    return this.http.post<CustomerLoginResponse>(`${this.base}/auth/login`, payload);
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

  /**
   * Soumet un paiement Mobile Money (v1 manuelle).
   * Le recouvrement est créé à l'état INITIÉ — validation agence requise.
   */
  submitMobileMoneyPayment(payload: MobileMoneyPaymentRequest): Observable<CustomerRecovery> {
    return this.http.post<CustomerRecovery>(`${this.base}/recoveries/mobile-money`, payload);
  }

  // ─── CATALOGUE & COMMANDES ───────────────────────────────────────────────

  getArticles(search?: string, category?: string): Observable<CustomerArticle[]> {
    const params: Record<string, string> = {};
    if (search)   params['search']   = search;
    if (category) params['category'] = category;
    return this.http.get<CustomerArticle[]>(`${this.base}/articles`, { params });
  }

  /**
   * Soumet une nouvelle commande à crédit.
   * Créée à l'état INITIÉ — le crédit démarre uniquement après livraison.
   */
  submitOrder(payload: OrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.base}/orders`, payload);
  }

  getOrders(): Observable<CustomerPurchase[]> {
    return this.http.get<CustomerPurchase[]>(`${this.base}/orders`);
  }
}
