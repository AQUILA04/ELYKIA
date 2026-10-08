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

/** Commande (PENDING) : uniquement pendant une session ouverte. */
export function canCreateTontineOrder(sessionStatus?: string | null): boolean {
  return sessionStatus === 'ACTIVE';
}

/** Remise physique (livraison directe / marquer comme livré) : uniquement session clôturée. */
export function canPhysicallyDeliverTontine(sessionStatus?: string | null): boolean {
  return sessionStatus === 'CLOSED';
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
