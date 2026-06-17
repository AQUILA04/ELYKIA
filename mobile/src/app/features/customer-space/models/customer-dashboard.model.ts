/**
 * Modèles du tableau de bord Espace Client ELYKIA
 * @author Francis AHONSU
 */

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
  status: CustomerRecoveryStatus | CustomerOrderStatus;
}

export type CustomerRecoveryStatus = 'INITIE' | 'VALIDE' | 'RETARD';
export type CustomerOrderStatus = 'INITIE' | 'VALIDE' | 'LIVRE';

export interface CustomerPurchase {
  id: string;
  reference: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dailyPayment: number;
  startDate: string;
  endDate: string;
  status: CustomerOrderStatus;
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

export interface CustomerRecovery {
  id: string;
  installmentNumber: number;
  amount: number;
  paymentDate: string;
  status: CustomerRecoveryStatus;
  mobileMoneyPhone?: string;
  mobileMoneyAmount?: number;
  mobileMoneyReference?: string;
  validatedAt?: string;
  validatedBy?: string;
}

export interface CustomerMobileMoneyPaymentRequest {
  distributionId: string;
  installmentNumber: number;
  expectedAmount: number;
  mobileMoneyPhone: string;
  mobileMoneyAmount: number;
  mobileMoneyReference: string;
  notes?: string;
}

export interface CustomerOrderRequest {
  items: CustomerOrderItemRequest[];
  deliveryAddress?: string;
  notes?: string;
}

export interface CustomerOrderItemRequest {
  articleId: string;
  quantity: number;
}
