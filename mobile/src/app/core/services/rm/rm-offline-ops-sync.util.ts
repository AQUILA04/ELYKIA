export interface RmOfflineOpsSyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

export interface RmOfflineOpsSyncable {
  localId: string;
}

/**
 * Pushes pending offline ops one-by-one and aggregates sync results.
 */
export async function syncPendingOfflineOps<T extends RmOfflineOpsSyncable>(opts: {
  listPending: () => Promise<T[]>;
  push: (op: T) => Promise<unknown>;
  markSynced: (localId: string) => Promise<void>;
  markError: (localId: string, error: string) => Promise<void>;
  label: (op: T) => string;
  extractError: (error: unknown) => string;
}): Promise<RmOfflineOpsSyncResult> {
  const pending = await opts.listPending();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const op of pending) {
    try {
      await opts.push(op);
      await opts.markSynced(op.localId);
      synced += 1;
    } catch (error) {
      failed += 1;
      const message = opts.extractError(error);
      errors.push(`${opts.label(op)}: ${message}`);
      await opts.markError(op.localId, message);
    }
  }

  return { synced, failed, errors };
}
