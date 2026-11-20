/** Saisie reçue par le serveur alors que le membre avait déjà une commande ou une livraison. */
export type TontineDeliveryConflictOperation = 'ORDER' | 'DIRECT_DELIVERY' | 'DELIVER';
export type TontineDeliveryConflictOutcome = 'MERGED' | 'REJECTED';
export type TontineDeliveryConflictReason =
  | 'ORDER_MERGED'
  | 'BALANCE_EXCEEDED'
  | 'ALREADY_DELIVERED'
  | 'ORDER_ALREADY_PENDING';

export interface TontineDeliveryConflict {
  id: number;
  tontineMemberId: number;
  tontineSessionId?: number;
  clientName?: string;
  commercialUsername?: string;
  existingDeliveryId?: number;
  existingReference?: string;
  existingAmount?: number;
  existingDeliveryDate?: string;
  incomingReference?: string;
  incomingAmount?: number;
  incomingItems?: string;
  availableBalance?: number;
  operation: TontineDeliveryConflictOperation;
  outcome: TontineDeliveryConflictOutcome;
  reason: TontineDeliveryConflictReason;
  deviceId?: string;
  recordedBy?: string;
  attempts: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export const CONFLICT_OPERATION_LABELS: Record<TontineDeliveryConflictOperation, string> = {
  ORDER: 'Commande',
  DIRECT_DELIVERY: 'Livraison directe',
  DELIVER: 'Remise de la commande'
};

export const CONFLICT_REASON_LABELS: Record<TontineDeliveryConflictReason, string> = {
  ORDER_MERGED: 'Ajoutée à la commande existante',
  BALANCE_EXCEEDED: 'Solde insuffisant pour les deux commandes',
  ALREADY_DELIVERED: 'Membre déjà livré',
  ORDER_ALREADY_PENDING: 'Commande déjà enregistrée, non livrée'
};
