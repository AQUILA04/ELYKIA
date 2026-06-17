import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CustomerLoginRequest,
  CustomerLoginResponse,
  CustomerDashboard,
  CustomerPurchase,
  CustomerMobileMoneyPaymentRequest,
  CustomerRecovery,
  CustomerOrderRequest,
} from '../models/customer-dashboard.model';
import { Article } from '../../../models/article.model';

/**
 * Service API centralisé pour l'Espace Client ELYKIA.
 * Tous les appels sont préfixés par /api/customer/ et requièrent
 * un token JWT client distinct du token commercial.
 *
 * @author Francis AHONSU
 */
@Injectable({ providedIn: 'root' })
export class CustomerApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/customer`;

  constructor(private http: HttpClient) {}

  // ─── AUTHENTIFICATION ────────────────────────────────────────────────────

  login(payload: CustomerLoginRequest): Observable<CustomerLoginResponse> {
    return this.http.post<CustomerLoginResponse>(`${this.baseUrl}/auth/login`, payload);
  }

  // ─── TABLEAU DE BORD ─────────────────────────────────────────────────────

  getDashboard(): Observable<CustomerDashboard> {
    return this.http.get<CustomerDashboard>(`${this.baseUrl}/dashboard`);
  }

  // ─── ACHATS / DISTRIBUTIONS ──────────────────────────────────────────────

  getPurchases(): Observable<CustomerPurchase[]> {
    return this.http.get<CustomerPurchase[]>(`${this.baseUrl}/purchases`);
  }

  getPurchaseById(id: string): Observable<CustomerPurchase> {
    return this.http.get<CustomerPurchase>(`${this.baseUrl}/purchases/${id}`);
  }

  // ─── RECOUVREMENTS ───────────────────────────────────────────────────────

  getRecoveries(distributionId: string): Observable<CustomerRecovery[]> {
    return this.http.get<CustomerRecovery[]>(`${this.baseUrl}/purchases/${distributionId}/recoveries`);
  }

  /**
   * Soumet un paiement Mobile Money (v1 manuelle).
   * Le recouvrement est créé à l'état INITIÉ et attend validation agence.
   */
  submitMobileMoneyPayment(payload: CustomerMobileMoneyPaymentRequest): Observable<CustomerRecovery> {
    return this.http.post<CustomerRecovery>(`${this.baseUrl}/recoveries/mobile-money`, payload);
  }

  // ─── CATALOGUE & COMMANDES ───────────────────────────────────────────────

  getArticles(search?: string, category?: string): Observable<Article[]> {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (category) params['category'] = category;
    return this.http.get<Article[]>(`${this.baseUrl}/articles`, { params });
  }

  /**
   * Soumet une nouvelle commande à crédit.
   * La commande est créée à l'état INITIÉ. Le crédit démarre à la livraison.
   */
  submitOrder(payload: CustomerOrderRequest): Observable<{ orderId: string; reference: string; status: string }> {
    return this.http.post<{ orderId: string; reference: string; status: string }>(`${this.baseUrl}/orders`, payload);
  }

  getOrders(): Observable<CustomerPurchase[]> {
    return this.http.get<CustomerPurchase[]>(`${this.baseUrl}/orders`);
  }
}
