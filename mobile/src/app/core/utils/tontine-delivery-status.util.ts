import { TontineDeliveryStatus } from '../../models/tontine.model';

const LABELS: Record<string, string> = {
  PENDING: 'Commande',
  VALIDATED: 'Validée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  SESSION_INPROGRESS: 'En cours'
};

export function getTontineDeliveryStatusLabel(status?: string | null): string {
  if (!status) {
    return 'Non défini';
  }
  return LABELS[status] || status;
}

export function canMarkTontineDeliveryAsDelivered(status?: string | null): boolean {
  return status === 'PENDING' || status === 'VALIDATED';
}

export function isTontineDeliveryOrder(status?: string | null): boolean {
  return status === 'PENDING' || status === 'VALIDATED';
}

export function resolveMemberDeliveryStatus(
  deliveryStatus: TontineDeliveryStatus
): 'PENDING' | 'VALIDATED' | 'DELIVERED' {
  if (deliveryStatus === 'DELIVERED') {
    return 'DELIVERED';
  }
  if (deliveryStatus === 'VALIDATED') {
    return 'VALIDATED';
  }
  return 'PENDING';
}
