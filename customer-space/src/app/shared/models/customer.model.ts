/**
 * Modèles métier — Espace Client ELYKIA
 * @author Francis AHONSU
 */

// ─── STATUTS ────────────────────────────────────────────────────────────────

export type RecoveryStatus = 'INITIE' | 'VALIDE' | 'RETARD';
export type OrderStatus    = 'INITIE' | 'VALIDE' | 'LIVRE';

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

// ─── COMMANDES ──────────────────────────────────────────────────────────────

export interface CustomerArticle {
  id: string;
  name: string;
  description?: string;
  category: string;
  creditSalePrice: number;
  imageUrl?: string;
  available: boolean;
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
