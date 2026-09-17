/** Backend OrderStatus enum values used on mobile. */
export type OrderStatusValue = 'PENDING' | 'ACCEPTED' | 'DENIED' | 'CANCEL' | 'SOLD';

const ALLOWED_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING: ['ACCEPTED', 'DENIED', 'CANCEL'],
  ACCEPTED: ['SOLD'],
  DENIED: ['PENDING'],
  CANCEL: ['PENDING'],
  SOLD: []
};

export function canTransitionOrderStatus(
  from: string,
  to: string
): boolean {
  const allowed = ALLOWED_TRANSITIONS[from as OrderStatusValue];
  return !!allowed && allowed.includes(to as OrderStatusValue);
}

/**
 * Steps required to reach a target status from the current one
 * (e.g. PENDING → SOLD needs ACCEPTED then SOLD).
 */
export function getOrderStatusTransitionPath(
  from: string,
  to: string
): OrderStatusValue[] {
  if (from === to) {
    return [];
  }
  if (canTransitionOrderStatus(from, to)) {
    return [to as OrderStatusValue];
  }
  if (from === 'PENDING' && to === 'SOLD') {
    return ['ACCEPTED', 'SOLD'];
  }
  throw new Error(`Transition de statut non autorisée : ${from} → ${to}`);
}

export function canModifyOrder(status: string): boolean {
  return status === 'PENDING';
}

export function canAcceptOrder(status: string): boolean {
  return status === 'PENDING';
}

export function canCancelOrder(status: string): boolean {
  return status === 'PENDING';
}

/** Commercial can deliver (create distribution + mark SOLD) from PENDING or ACCEPTED. */
export function canDeliverOrder(status: string): boolean {
  return status === 'PENDING' || status === 'ACCEPTED';
}

export function getOrderStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'En attente';
    case 'ACCEPTED':
      return 'Acceptée';
    case 'DENIED':
      return 'Refusée';
    case 'CANCEL':
      return 'Annulée';
    case 'SOLD':
      return 'Livrée';
    default:
      return status || '—';
  }
}

export function getOrderStatusClass(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'status-pending';
    case 'ACCEPTED':
      return 'status-accepted';
    case 'DENIED':
      return 'status-denied';
    case 'CANCEL':
      return 'status-cancel';
    case 'SOLD':
      return 'status-sold';
    default:
      return 'status-pending';
  }
}
