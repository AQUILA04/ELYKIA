/**
 * Modèles métier — Espace Client ELYKIA
 * @author Francis AHONSU
 */

// ─── STATUTS ────────────────────────────────────────────────────────────────

export type RecoveryStatus = 'INITIE' | 'VALIDE' | 'RETARD';
export type OrderStatus    = 'INITIE' | 'VALIDE' | 'LIVRE';
export type TontineDeliveryStatus = 'SESSION_INPROGRESS' | 'PENDING' | 'VALIDATED' | 'DELIVERED';
export type TontineSessionStatus = 'ACTIVE' | 'CLOSED' | 'ENDED';

// ─── TABLEAU DE BORD ────────────────────────────────────────────────────────

export interface CustomerDashboard {
  clientId: string;
  fullName: string;
  activeCreditCount: number;
  totalCreditAmount: number;
  totalPaidAmount: number;
  totalRemainingAmount: number;
  nextPaymentAmount: number;
  nextPaymentDate: string;
  /** ID du crédit pour initier le paiement (absent si aucune mise en attente). */
  nextPaymentCreditId?: string;
  nextInstallmentNumber?: number;
  progressPercent: number;
  recentActivities: CustomerActivity[];
}

export interface CustomerActivity {
  id: string;
  type: 'RECOVERY' | 'ORDER' | 'DELIVERY';
  label: string;
  amount: number;
  date: string;
  status: RecoveryStatus | OrderStatus;
}

// ─── ACHATS / DISTRIBUTIONS ─────────────────────────────────────────────────

export interface CustomerPurchase {
  id: string;
  reference: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dailyPayment: number;
  startDate: string;
  endDate: string;
  status: OrderStatus;
  articleCount: number;
  items: CustomerPurchaseItem[];
  recoveries: CustomerRecovery[];
  installmentCount: number;
  paidInstallmentCount: number;
  lateInstallmentCount: number;
  initiatedInstallmentCount: number;
}

export interface CustomerPurchaseItem {
  articleId: string;
  articleName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// ─── RECOUVREMENTS ──────────────────────────────────────────────────────────

export interface CustomerRecovery {
  id: string;
  installmentNumber: number;
  amount: number;
  paymentDate: string;
  status: RecoveryStatus;
  mobileMoneyPhone?: string;
  mobileMoneyAmount?: number;
  mobileMoneyReference?: string;
  validatedAt?: string;
  validatedBy?: string;
}

export interface MobileMoneyPaymentRequest {
  distributionId: string;
  installmentNumber: number;
  expectedAmount: number;
  mobileMoneyPhone: string;
  mobileMoneyAmount: number;
  mobileMoneyReference: string;
  notes?: string;
}

export interface MobileMoneyRecipient {
  collector?: string;
  collectorName?: string;
  mixxNumber?: string;
  moovNumber?: string;
  mixxUsesGlobalDefault?: boolean;
  moovUsesGlobalDefault?: boolean;
}

// ─── TONTINE ────────────────────────────────────────────────────────────────

export interface CustomerTontineContributionSummary {
  memberId: string;
  sessionYear: number;
  deliveryStatus: TontineDeliveryStatus;
  dailyStake: number;
  totalContribution: number;
  societyShare: number;
  availableContribution: number;
  validatedMonths: number;
  currentMonthDays: number;
  registrationDate: string;
  sessionStartDate: string;
  sessionEndDate: string;
  sessionStatus: TontineSessionStatus;
}

export interface CustomerTontineMonthlySummary {
  month: string;
  year: number;
  count: number;
  totalAmount: number;
  equivalentDays: number;
  isFuture: boolean;
  isCurrent: boolean;
}

export interface CustomerTontineContributionDetail extends CustomerTontineContributionSummary {
  monthlySummaries: CustomerTontineMonthlySummary[];
}

export interface CustomerTontinePayment {
  id: string;
  reference?: string;
  amount: number;
  collectionDate: string;
  deliveryCollection: boolean;
  societyShareAmount: number;
  status: RecoveryStatus | 'VALIDE';
}

export interface CustomerTontinePaymentPage {
  items: CustomerTontinePayment[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ─── COMMANDES ──────────────────────────────────────────────────────────────

export interface CustomerArticle {
  id: string;
  name: string;
  commercialName?: string;
  displayName?: string;
  description?: string;
  category: string;
  creditSalePrice: number;
  imageUrl?: string;
  available: boolean;
}

export interface CustomerArticleType {
  type: string;
  label: string;
  totalQuantitySold: number;
}

export interface CartItem {
  article: CustomerArticle;
  quantity: number;
}

export interface OrderRequest {
  items: { articleId: string; quantity: number }[];
  deliveryAddress?: string;
  notes?: string;
}

export interface OrderResponse {
  orderId: string;
  reference: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
}
