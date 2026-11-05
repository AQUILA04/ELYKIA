export type SyncErrorScope = 'rm' | 'commercial';

const RM_ENTITY_PREFIX = 'rm-';

export function isRmSyncEntityType(entityType: string | null | undefined): boolean {
  return !!entityType && entityType.startsWith(RM_ENTITY_PREFIX);
}

export function syncErrorVisibleForScope(
  entityType: string | null | undefined,
  scope: SyncErrorScope
): boolean {
  const rm = isRmSyncEntityType(entityType);
  return scope === 'rm' ? rm : !rm;
}

/** Fragment SQL (sans AND) limitant sync_logs au profil connecté. */
export function syncErrorScopeSql(scope: SyncErrorScope): string {
  if (scope === 'rm') {
    return `entityType LIKE 'rm-%'`;
  }
  return `(entityType IS NULL OR entityType NOT LIKE 'rm-%')`;
}
