/** Ligne de rm_offline_ops, telle que lue dans SQLite. */
export interface RmOfflineOpRow {
  queue_key: string;
  local_id: string;
  payload: string;
  is_sync: number;
  sync_error_id: string | null;
}

const RM_OPS_INSERT = /^INSERT INTO rm_offline_ops\b.*$/gm;

/**
 * Nombre de saisies RM non envoyées contenues dans un fichier de sauvegarde SQL.
 * Chaque ligne exportée porte le JSON de l'opération, qui contient `"isSync":false`.
 */
export function countUnsyncedRmOpsInBackup(sql: string): number {
  if (!sql) {
    return 0;
  }
  const lines = sql.match(RM_OPS_INSERT) ?? [];
  return lines.filter(line => line.includes('"isSync":false')).length;
}

/**
 * Après une restauration, les saisies non envoyées présentes AVANT la restauration doivent survivre :
 * la sauvegarde est forcément plus ancienne que la base courante.
 * Une même opération (même file, même identifiant) est remplacée par la version courante.
 */
export function planRmOpsReinjection(
  currentUnsynced: readonly RmOfflineOpRow[]
): RmOfflineOpRow[] {
  const seen = new Set<string>();
  const plan: RmOfflineOpRow[] = [];
  for (const row of currentUnsynced) {
    if (!row?.queue_key || !row.local_id || row.is_sync) {
      continue;
    }
    const key = `${row.queue_key}\u0000${row.local_id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    plan.push(row);
  }
  return plan;
}
