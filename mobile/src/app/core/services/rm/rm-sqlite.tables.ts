export const RM_OFFLINE_OPS_TABLE = 'rm_offline_ops';
export const RM_SCOPE_TABLE = 'rm_scope';

export const RM_SQLITE_TABLES = [RM_OFFLINE_OPS_TABLE, RM_SCOPE_TABLE] as const;

export function rmSqliteDdl(): string {
  return `
        CREATE TABLE IF NOT EXISTS ${RM_OFFLINE_OPS_TABLE} (
            queue_key TEXT NOT NULL,
            local_id TEXT NOT NULL,
            payload TEXT NOT NULL,
            is_sync INTEGER NOT NULL DEFAULT 0,
            sync_error_id TEXT,
            position INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (queue_key, local_id)
        );

        CREATE TABLE IF NOT EXISTS ${RM_SCOPE_TABLE} (
            key TEXT PRIMARY KEY,
            payload TEXT NOT NULL
        );
  `;
}

/** Ajoute les tables RM au dump SQL si elles n'y figurent pas encore. */
export function withRmBackupTables(tables: string[]): string[] {
  const next = [...tables];
  for (const name of RM_SQLITE_TABLES) {
    if (!next.includes(name)) {
      next.push(name);
    }
  }
  return next;
}
