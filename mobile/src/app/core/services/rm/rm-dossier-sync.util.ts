/** Pastille Sync / Local d'un dossier du chef de recouvrement. */
export interface RmSyncIndex {
  localCreditIds: Set<number>;
  localMemberIds: Set<number>;
  localClientIds: Set<number>;
}

export interface RmSyncQueueSnapshot {
  closes: Array<{ creditId: number; isSync: boolean }>;
  creditControls: Array<{ creditId: number; isSync: boolean }>;
  creditCarnets: Array<{ creditId: number; isSync: boolean }>;
  tontineControls: Array<{ tontineMemberId: number; isSync: boolean }>;
  tontineCarnets: Array<{ tontineMemberId: number; isSync: boolean }>;
  contacts: Array<{ clientId: number; isSync: boolean }>;
  assigns: Array<{ clientIds: number[]; isSync: boolean }>;
}

export function emptyRmSyncIndex(): RmSyncIndex {
  return {
    localCreditIds: new Set<number>(),
    localMemberIds: new Set<number>(),
    localClientIds: new Set<number>()
  };
}

/** Une opération non transmise (y compris après un échec) laisse le dossier en Local. */
export function buildRmSyncIndex(queues: RmSyncQueueSnapshot): RmSyncIndex {
  const index = emptyRmSyncIndex();
  for (const op of queues.closes) {
    if (!op.isSync) {
      index.localCreditIds.add(op.creditId);
    }
  }
  for (const op of queues.creditControls) {
    if (!op.isSync) {
      index.localCreditIds.add(op.creditId);
    }
  }
  for (const op of queues.creditCarnets) {
    if (!op.isSync) {
      index.localCreditIds.add(op.creditId);
    }
  }
  for (const op of queues.tontineControls) {
    if (!op.isSync) {
      index.localMemberIds.add(op.tontineMemberId);
    }
  }
  for (const op of queues.tontineCarnets) {
    if (!op.isSync) {
      index.localMemberIds.add(op.tontineMemberId);
    }
  }
  for (const op of queues.contacts) {
    if (!op.isSync) {
      index.localClientIds.add(op.clientId);
    }
  }
  for (const op of queues.assigns) {
    if (!op.isSync) {
      for (const clientId of op.clientIds || []) {
        index.localClientIds.add(clientId);
      }
    }
  }
  return index;
}

export function isCreditLocal(index: RmSyncIndex, creditId: number, clientId?: number | null): boolean {
  if (index.localCreditIds.has(creditId)) {
    return true;
  }
  return clientId != null && index.localClientIds.has(clientId);
}

export function isTontineLocal(index: RmSyncIndex, memberId: number, clientId?: number | null): boolean {
  if (index.localMemberIds.has(memberId)) {
    return true;
  }
  return clientId != null && index.localClientIds.has(clientId);
}

export function isClientLocal(
  index: RmSyncIndex,
  clientId: number,
  links?: { creditIds?: number[]; memberIds?: number[] }
): boolean {
  if (index.localClientIds.has(clientId)) {
    return true;
  }
  if (links?.creditIds?.some(id => index.localCreditIds.has(id))) {
    return true;
  }
  return !!links?.memberIds?.some(id => index.localMemberIds.has(id));
}
