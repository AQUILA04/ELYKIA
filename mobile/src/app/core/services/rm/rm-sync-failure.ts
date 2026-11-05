import { SyncErrorService } from '../sync-error.service';

export const RM_SYNC_ENTITY = {
  close: 'rm-close',
  contact: 'rm-contact',
  fieldControl: 'rm-field-control',
  tontineFieldControl: 'rm-tontine-field-control',
  carnet: 'rm-carnet',
  creditCarnet: 'rm-credit-carnet',
  assign: 'rm-assign'
} as const;

export type RmSyncEntityType = typeof RM_SYNC_ENTITY[keyof typeof RM_SYNC_ENTITY];

const RM_SYNC_ENTITY_LABELS: Record<string, string> = {
  [RM_SYNC_ENTITY.close]: 'Clôture',
  [RM_SYNC_ENTITY.contact]: 'Contact',
  [RM_SYNC_ENTITY.fieldControl]: 'Contrôle crédit',
  [RM_SYNC_ENTITY.tontineFieldControl]: 'Contrôle tontine',
  [RM_SYNC_ENTITY.carnet]: 'Vérification carnet tontine',
  [RM_SYNC_ENTITY.creditCarnet]: 'Vérification carnet crédit',
  [RM_SYNC_ENTITY.assign]: 'Transfert de commercial'
};

export function syncEntityLabel(entityType: string | null | undefined): string {
  if (!entityType) {
    return '';
  }
  return RM_SYNC_ENTITY_LABELS[entityType] || entityType;
}

export async function logRmSyncFailure(
  syncErrors: SyncErrorService,
  entityType: RmSyncEntityType,
  op: { localId: string },
  displayName: string,
  error: unknown
): Promise<string | null> {
  return syncErrors.logSyncError(
    entityType,
    op.localId,
    'CREATE',
    error,
    op,
    displayName,
    op
  );
}

export async function resolveRmSyncSuccess(
  syncErrors: SyncErrorService,
  op: { syncErrorId?: string | null }
): Promise<void> {
  await syncErrors.resolveSyncError(op.syncErrorId);
}
