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
  CustomerLocality,
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
  CustomerTontineSession,
  CustomerTontineJoinRequest,
  CustomerTontineJoinResponse,
  TontineMobileMoneyPaymentRequest,
  CustomerOnboardingStatus,
  CustomerInitialDeposit,
  CustomerInitialDepositRequest,
  CustomerNotification,
  CustomerPaymentProof,
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

  getLocalities(): Observable<CustomerLocality[]> {
    return this.http.get<CustomerLocality[]>(`${this.base}/auth/localities`);
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

  uploadPaymentProof(
    file: Blob,
    fileName: string,
    replacesProofId?: number | null,
  ): Observable<CustomerPaymentProof> {
    const formData = new FormData();
    formData.append('file', file, fileName);
    const params: Record<string, string> = {};
    if (replacesProofId != null) {
      params['replacesProofId'] = String(replacesProofId);
    }
    return this.http.post<CustomerPaymentProof>(`${this.base}/payment-proofs`, formData, { params });
  }

  deletePaymentProof(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/payment-proofs/${id}`);
  }

  // ─── TONTINE ──────────────────────────────────────────────────────────────

  getTontineContributions(): Observable<CustomerTontineContributionSummary[]> {
    return this.http.get<CustomerTontineContributionSummary[]>(`${this.base}/tontine/contributions`);
  }

  getCurrentTontineSession(): Observable<CustomerTontineSession> {
    return this.http.get<CustomerTontineSession>(`${this.base}/tontine/session/current`);
  }

  getTontineJoinRecipients(): Observable<MobileMoneyRecipient> {
    return this.http.get<MobileMoneyRecipient>(`${this.base}/tontine/mobile-money-recipients`);
  }

  joinTontineSession(payload: CustomerTontineJoinRequest): Observable<CustomerTontineJoinResponse> {
    return this.http.post<CustomerTontineJoinResponse>(`${this.base}/tontine/join`, payload);
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

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────

  getNotifications(limit = 50): Observable<CustomerNotification[]> {
    return this.http.get<CustomerNotification[]>(`${this.base}/notifications`, {
      params: { limit: String(limit) },
    });
  }

  getUnreadNotificationCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/notifications/unread-count`);
  }

  markNotificationRead(id: number): Observable<CustomerNotification> {
    return this.http.post<CustomerNotification>(`${this.base}/notifications/${id}/read`, {});
  }

  markAllNotificationsRead(): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.base}/notifications/read-all`, {});
  }
}
