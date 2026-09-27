import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CustomerCheckPhoneRequest,
  CustomerCheckPhoneResponse,
  CustomerLoginRequest,
  CustomerLoginResponse,
  CustomerOtpSendResponse,
  CustomerOtpVerifyRequest,
  CustomerOtpVerifyResponse,
  CustomerSetupPinRequest,
  CustomerRegisterRequest,
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
  CustomerTontinePayment,
  CustomerTontinePaymentPage,
  TontineMobileMoneyPaymentRequest,
  CustomerOnboardingStatus,
  CustomerInitialDeposit,
  CustomerInitialDepositRequest,
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

  sendOtp(payload: CustomerCheckPhoneRequest): Observable<CustomerOtpSendResponse> {
    return this.http.post<CustomerOtpSendResponse>(`${this.base}/auth/send-otp`, payload);
  }

  verifyOtp(payload: CustomerOtpVerifyRequest): Observable<CustomerOtpVerifyResponse> {
    return this.http.post<CustomerOtpVerifyResponse>(`${this.base}/auth/verify-otp`, payload);
  }

  setupPin(payload: CustomerSetupPinRequest): Observable<CustomerLoginResponse> {
    return this.http.post<CustomerLoginResponse>(`${this.base}/auth/setup-pin`, payload);
  }

  register(payload: CustomerRegisterRequest): Observable<CustomerLoginResponse> {
    return this.http.post<CustomerLoginResponse>(`${this.base}/auth/register`, payload);
  }

  // ─── ONBOARDING ──────────────────────────────────────────────────────────

  getOnboardingStatus(): Observable<CustomerOnboardingStatus> {
    return this.http.get<CustomerOnboardingStatus>(`${this.base}/onboarding/status`);
  }

  uploadIdDocument(payload: { cardType?: string; cardID?: string; cardPhoto: string }): Observable<CustomerOnboardingStatus> {
    return this.http.post<CustomerOnboardingStatus>(`${this.base}/onboarding/id-document`, payload);
  }

  getInitialDepositRecipients(): Observable<MobileMoneyRecipient> {
    return this.http.get<MobileMoneyRecipient>(`${this.base}/onboarding/mobile-money-recipients`);
  }

  submitInitialDeposit(payload: CustomerInitialDepositRequest): Observable<CustomerInitialDeposit> {
    return this.http.post<CustomerInitialDeposit>(`${this.base}/onboarding/initial-deposit`, payload);
  }

  getInitialDeposit(): Observable<CustomerInitialDeposit> {
    return this.http.get<CustomerInitialDeposit>(`${this.base}/onboarding/initial-deposit`);
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

  getTontineMobileMoneyRecipients(memberId: string): Observable<MobileMoneyRecipient> {
    return this.http.get<MobileMoneyRecipient>(
      `${this.base}/tontine/contributions/${memberId}/mobile-money-recipients`,
    );
  }

  submitTontineMobileMoneyPayment(
    memberId: string,
    payload: TontineMobileMoneyPaymentRequest,
  ): Observable<CustomerTontinePayment> {
    return this.http.post<CustomerTontinePayment>(
      `${this.base}/tontine/contributions/${memberId}/mobile-money`,
      payload,
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
