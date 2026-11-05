/** Pastille Sync / Local d'un dossier du chef de recouvrement. */
export interface RmSyncIndex {
  localCreditIds: Set<number>;
  localMemberIds: Set<number>;
  localClientIds: Set<number>;
  /** Échec le plus récent par dossier (les files sont rangées du plus récent au plus ancien). */
  creditErrorIds: Map<number, string>;
  memberErrorIds: Map<number, string>;
  clientErrorIds: Map<number, string>;
}

export interface RmSyncQueueSnapshot {
  closes: Array<{ creditId: number; isSync: boolean; syncErrorId?: string | null }>;
  creditControls: Array<{ creditId: number; isSync: boolean; syncErrorId?: string | null }>;
  creditCarnets: Array<{ creditId: number; isSync: boolean; syncErrorId?: string | null }>;
  tontineControls: Array<{ tontineMemberId: number; isSync: boolean; syncErrorId?: string | null }>;
  tontineCarnets: Array<{ tontineMemberId: number; isSync: boolean; syncErrorId?: string | null }>;
  contacts: Array<{ clientId: number; isSync: boolean; syncErrorId?: string | null }>;
  assigns: Array<{ clientIds: number[]; isSync: boolean; syncErrorId?: string | null }>;
}

export function emptyRmSyncIndex(): RmSyncIndex {
  return {
    localCreditIds: new Set<number>(),
    localMemberIds: new Set<number>(),
    localClientIds: new Set<number>(),
    creditErrorIds: new Map<number, string>(),
    memberErrorIds: new Map<number, string>(),
    clientErrorIds: new Map<number, string>()
  };
}

function rememberError(map: Map<number, string>, id: number, syncErrorId?: string | null): void {
  if (syncErrorId && !map.has(id)) {
    map.set(id, syncErrorId);
  }
}

/** Une opération non transmise (y compris après un échec) laisse le dossier en Local. */
export function buildRmSyncIndex(queues: RmSyncQueueSnapshot): RmSyncIndex {
  const index = emptyRmSyncIndex();
  for (const op of queues.closes) {
    if (!op.isSync) {
      index.localCreditIds.add(op.creditId);
      rememberError(index.creditErrorIds, op.creditId, op.syncErrorId);
    }
  }
  for (const op of queues.creditControls) {
    if (!op.isSync) {
      index.localCreditIds.add(op.creditId);
      rememberError(index.creditErrorIds, op.creditId, op.syncErrorId);
    }
  }
  for (const op of queues.creditCarnets) {
    if (!op.isSync) {
      index.localCreditIds.add(op.creditId);
      rememberError(index.creditErrorIds, op.creditId, op.syncErrorId);
    }
  }
  for (const op of queues.tontineControls) {
    if (!op.isSync) {
      index.localMemberIds.add(op.tontineMemberId);
      rememberError(index.memberErrorIds, op.tontineMemberId, op.syncErrorId);
    }
  }
  for (const op of queues.tontineCarnets) {
    if (!op.isSync) {
      index.localMemberIds.add(op.tontineMemberId);
      rememberError(index.memberErrorIds, op.tontineMemberId, op.syncErrorId);
    }
  }
  for (const op of queues.contacts) {
    if (!op.isSync) {
      index.localClientIds.add(op.clientId);
      rememberError(index.clientErrorIds, op.clientId, op.syncErrorId);
    }
  }
  for (const op of queues.assigns) {
    if (!op.isSync) {
      for (const clientId of op.clientIds || []) {
        index.localClientIds.add(clientId);
        rememberError(index.clientErrorIds, clientId, op.syncErrorId);
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

export function syncErrorIdForCredit(
  index: RmSyncIndex,
  creditId: number,
  clientId?: number | null
): string | null {
  return index.creditErrorIds.get(creditId)
    ?? (clientId != null ? index.clientErrorIds.get(clientId) ?? null : null);
}

export function syncErrorIdForTontine(
  index: RmSyncIndex,
  memberId: number,
  clientId?: number | null
): string | null {
  return index.memberErrorIds.get(memberId)
    ?? (clientId != null ? index.clientErrorIds.get(clientId) ?? null : null);
}

export function syncErrorIdForClient(
  index: RmSyncIndex,
  clientId: number,
  links?: { creditIds?: number[]; memberIds?: number[] }
): string | null {
  const direct = index.clientErrorIds.get(clientId);
  if (direct) {
    return direct;
  }
  for (const creditId of links?.creditIds ?? []) {
    const errorId = index.creditErrorIds.get(creditId);
    if (errorId) {
      return errorId;
    }
  }
  for (const memberId of links?.memberIds ?? []) {
    const errorId = index.memberErrorIds.get(memberId);
    if (errorId) {
      return errorId;
    }
  }
  return null;
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
