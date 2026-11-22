import { TontineMemberDeliveryStatus } from '../types/tontine.types';

export interface TontineDeliveryListItem {
  id: number;
  tontineMemberId: number;
  clientId: number;
  clientFirstname: string;
  clientLastname: string;
  clientPhone?: string;
  reference?: string;
  deliveryDate: string;
  requestDate?: string;
  /** Date de livraison prévue (AAAA-MM-JJ), facultative. */
  plannedDeliveryDate?: string | null;
  totalAmount: number;
  remainingBalance: number;
  commercialUsername: string;
  deliveryStatus: TontineMemberDeliveryStatus;
  itemCount: number;
}

export interface TontineDeliveryKpi {
  totalCount: number;
  totalAmount: number;
  totalRemainingBalance: number;
  pendingCount: number;
  validatedCount: number;
  deliveredCount: number;
}
