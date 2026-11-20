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

/** Compare les statuts sans dépendre de la casse ni des espaces renvoyés par le stockage local. */
export function normalizeTontineStatus(status?: string | null): string | null {
  if (status == null) {
    return null;
  }
  const normalized = String(status).trim().toUpperCase();
  return normalized.length ? normalized : null;
}

/** Commande (PENDING) : session ouverte ou clôturée. Refusée seulement une fois la campagne terminée (ENDED). */
export function canCreateTontineOrder(sessionStatus?: string | null): boolean {
  const status = normalizeTontineStatus(sessionStatus);
  return status === 'ACTIVE' || status === 'CLOSED';
}

/** Remise physique (livraison directe / marquer comme livré) : uniquement session clôturée. */
export function canPhysicallyDeliverTontine(sessionStatus?: string | null): boolean {
  return normalizeTontineStatus(sessionStatus) === 'CLOSED';
}

/**
 * Cotisation normale (fiche membre / Cotiser) : uniquement session ouverte.
 * Dès la clôture (CLOSED) ou la fin (ENDED), l'entrée est refusée.
 */
export function canRecordNormalTontineCollection(sessionStatus?: string | null): boolean {
  return normalizeTontineStatus(sessionStatus) === 'ACTIVE';
}

/**
 * Complément de solde / collecte à la livraison : autorisé en session ouverte ou clôturée.
 * Refusé seulement quand la campagne est terminée (ENDED) ou le statut est inconnu.
 */
export function canRecordDeliveryTontineCollection(sessionStatus?: string | null): boolean {
  const status = normalizeTontineStatus(sessionStatus);
  return status === 'ACTIVE' || status === 'CLOSED';
}

/**
 * Libellé du menu ⋮ de la fiche membre.
 * Session ouverte : commande. Session clôturée : remise. Les autres statuts n'ouvrent pas le flux.
 */
export function tontineDeliveryCreationMenuLabel(sessionStatus?: string | null): string | null {
  if (canPhysicallyDeliverTontine(sessionStatus)) {
    return 'Livraison Fin d\'Année';
  }
  if (canCreateTontineOrder(sessionStatus)) {
    return 'Commande de tontine';
  }
  return null;
}

export function isCancelledTontineDelivery(status?: string | null): boolean {
  const normalized = normalizeTontineStatus(status);
  return normalized === 'CANCELLED' || normalized === 'CANCELED';
}

/** Une commande ou une remise déjà enregistrée occupe l'unique livraison du membre. */
export function isBlockingTontineDeliveryStatus(status?: string | null): boolean {
  const normalized = normalizeTontineStatus(status);
  return normalized === 'PENDING' || normalized === 'VALIDATED' || normalized === 'DELIVERED';
}

/**
 * Le DTO de livraison (`TontineDeliveryRespDto`) n'a pas de statut.
 * La liste web envoie `deliveryStatus`. À défaut, le statut est celui du membre.
 * `SESSION_INPROGRESS` signifie qu'aucune commande n'est en cours : on ne le recopie pas.
 */
export function resolvePulledTontineDeliveryStatus(
  delivery?: { status?: string | null; deliveryStatus?: string | null } | null,
  memberDeliveryStatus?: string | null
): string | null {
  const explicit = delivery?.status ?? delivery?.deliveryStatus;
  if (isCancelledTontineDelivery(explicit) || isBlockingTontineDeliveryStatus(explicit)) {
    return normalizeTontineStatus(explicit);
  }
  if (isBlockingTontineDeliveryStatus(memberDeliveryStatus)) {
    return normalizeTontineStatus(memberDeliveryStatus);
  }
  return null;
}

function blockingStatusForMemberDelivery(
  deliveryStatus?: string | null,
  memberDeliveryStatus?: string | null
): string | null {
  if (isCancelledTontineDelivery(deliveryStatus)) {
    return null;
  }
  if (isBlockingTontineDeliveryStatus(deliveryStatus)) {
    return normalizeTontineStatus(deliveryStatus);
  }
  if (isBlockingTontineDeliveryStatus(memberDeliveryStatus)) {
    return normalizeTontineStatus(memberDeliveryStatus);
  }
  return null;
}

/**
 * Retient la livraison qui empêche une nouvelle commande.
 * Une livraison annulée, ou une ligne sans statut alors que le membre n'a pas de commande, est ignorée.
 */
export function pickMemberTontineDelivery<T extends { status?: string | null; requestDate?: string | null }>(
  deliveries: T[] | null | undefined,
  memberDeliveryStatus?: string | null
): T | null {
  if (!deliveries?.length) {
    return null;
  }
  const ranked = deliveries
    .map(delivery => ({
      delivery,
      status: blockingStatusForMemberDelivery(delivery.status, memberDeliveryStatus)
    }))
    .filter((entry): entry is { delivery: T; status: string } => !!entry.status)
    .sort((a, b) => String(b.delivery.requestDate || '').localeCompare(String(a.delivery.requestDate || '')));

  if (!ranked.length) {
    return null;
  }
  const chosen = ranked[0];
  if (normalizeTontineStatus(chosen.delivery.status) === chosen.status) {
    return chosen.delivery;
  }
  return { ...chosen.delivery, status: chosen.status as T['status'] };
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
