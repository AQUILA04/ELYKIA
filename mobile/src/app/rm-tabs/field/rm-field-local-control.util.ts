/**
 * Fusion « liste serveur + saisie locale » d'un contrôle terrain.
 *
 * Après une reconnexion, la liste en ligne ne connaît pas encore les contrôles encore en file
 * (isSync=false). Sans fusion, le RM les croirait perdus et les referait.
 * - pas de contrôle serveur : on montre le contrôle local ;
 * - local plus récent (ou égal) que le serveur : on montre le local ;
 * - serveur plus récent : on garde le serveur et on signale le conflit (le contrôle local reste en file).
 */
export interface RmLocalControlLike {
  status?: string | null;
  observedAt?: string | null;
  isSync: boolean;
}

export interface RmServerControlLike {
  status?: string | null;
  observedAt?: string | null;
}

export interface RmMergedControl<L, S> {
  source: 'local' | 'server' | 'none';
  local: L | null;
  server: S | null;
  /** Vrai quand le serveur a un contrôle plus récent que celui qui attend sur le téléphone. */
  conflict: boolean;
}

function toTime(value: string | null | undefined): number {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(time) ? 0 : time;
}

/** Contrôle local en attente le plus récent parmi ceux d'un même dossier. */
export function latestPendingControl<T extends RmLocalControlLike>(ops: readonly T[]): T | null {
  let best: T | null = null;
  for (const op of ops) {
    if (op.isSync) {
      continue;
    }
    if (!best || toTime(op.observedAt) >= toTime(best.observedAt)) {
      best = op;
    }
  }
  return best;
}

export function mergeRmFieldControl<L extends RmLocalControlLike, S extends RmServerControlLike>(
  local: L | null | undefined,
  server: S | null | undefined
): RmMergedControl<L, S> {
  const pending = local && !local.isSync ? local : null;
  const known = server?.status ? server : null;

  if (!pending && !known) {
    return { source: 'none', local: null, server: null, conflict: false };
  }
  if (!pending) {
    return { source: 'server', local: null, server: known, conflict: false };
  }
  if (!known) {
    return { source: 'local', local: pending, server: null, conflict: false };
  }
  const serverIsNewer = toTime(known.observedAt) > toTime(pending.observedAt);
  return serverIsNewer
    ? { source: 'server', local: pending, server: known, conflict: true }
    : { source: 'local', local: pending, server: known, conflict: false };
}
