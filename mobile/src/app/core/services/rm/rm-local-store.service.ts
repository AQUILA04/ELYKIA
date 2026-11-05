import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { DatabaseService } from '../database.service';
import { onRmDataRestored } from './rm-data-restored';
import { RM_OFFLINE_OPS_TABLE, RM_SCOPE_TABLE } from './rm-sqlite.tables';

export interface RmPersistedOp {
  localId: string;
  isSync: boolean;
  syncErrorId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RmLocalStore {
  private readonly migratedQueues = new Set<string>();
  private readonly migratedScope = new Set<string>();

  constructor(
    private readonly database: DatabaseService,
    private readonly storage: Storage
  ) {}

  /** Réinscrit un rechargement mémoire après restauration du backup. */
  watchRestore(reload: () => Promise<void>): void {
    onRmDataRestored(reload);
  }

  async loadOps<T>(queueKey: string): Promise<T[]> {
    await this.migrateQueue(queueKey);
    const result = await this.database.query(
      `SELECT payload FROM ${RM_OFFLINE_OPS_TABLE} WHERE queue_key = ? ORDER BY position ASC`,
      [queueKey]
    );
    const rows = result?.values || [];
    const ops: T[] = [];
    for (const row of rows) {
      const raw = cell(row, 'payload', 0);
      if (typeof raw !== 'string' || !raw) {
        continue;
      }
      try {
        ops.push(JSON.parse(raw) as T);
      } catch {
        // Ligne illisible : on l'ignore pour ne pas bloquer la file.
      }
    }
    return ops;
  }

  async saveOps<T extends RmPersistedOp>(queueKey: string, ops: T[]): Promise<void> {
    await this.database.initializeDatabaseOnce();
    const unique = dedupeByLocalId(ops);
    await this.database.execute(
      `DELETE FROM ${RM_OFFLINE_OPS_TABLE} WHERE queue_key = ?`,
      [queueKey]
    );
    if (!unique.length) {
      return;
    }
    await this.database.executeSet(unique.map((op, position) => ({
      statement: `INSERT INTO ${RM_OFFLINE_OPS_TABLE}
        (queue_key, local_id, payload, is_sync, sync_error_id, position)
        VALUES (?, ?, ?, ?, ?, ?)`,
      values: [
        queueKey,
        op.localId,
        JSON.stringify(op),
        op.isSync ? 1 : 0,
        op.syncErrorId ?? null,
        position
      ]
    })));
  }

  async loadScope(key: string): Promise<string | null> {
    await this.migrateScopeKey(key);
    const result = await this.database.query(
      `SELECT payload FROM ${RM_SCOPE_TABLE} WHERE key = ?`,
      [key]
    );
    const row = result?.values?.[0];
    if (!row) {
      return null;
    }
    const payload = cell(row, 'payload', 0);
    return typeof payload === 'string' ? payload : null;
  }

  async saveScope(key: string, payload: string): Promise<void> {
    await this.database.initializeDatabaseOnce();
    await this.database.execute(
      `INSERT OR REPLACE INTO ${RM_SCOPE_TABLE} (key, payload) VALUES (?, ?)`,
      [key, payload]
    );
  }

  async removeScope(key: string): Promise<void> {
    await this.database.initializeDatabaseOnce();
    await this.database.execute(`DELETE FROM ${RM_SCOPE_TABLE} WHERE key = ?`, [key]);
  }

  private async migrateQueue(queueKey: string): Promise<void> {
    if (this.migratedQueues.has(queueKey)) {
      return;
    }
    await this.database.initializeDatabaseOnce();
    const count = await this.countOps(queueKey);
    if (count > 0) {
      this.migratedQueues.add(queueKey);
      return;
    }
    await this.storage.create();
    const legacy = await this.storage.get(queueKey);
    if (Array.isArray(legacy) && legacy.length > 0) {
      await this.saveOps(queueKey, legacy as RmPersistedOp[]);
      await this.storage.remove(queueKey);
    }
    this.migratedQueues.add(queueKey);
  }

  private async migrateScopeKey(key: string): Promise<void> {
    if (this.migratedScope.has(key)) {
      return;
    }
    await this.database.initializeDatabaseOnce();
    const existing = await this.readScopePayload(key);
    if (existing != null) {
      this.migratedScope.add(key);
      return;
    }
    await this.storage.create();
    const legacy = await this.storage.get(key);
    if (legacy != null) {
      const payload = typeof legacy === 'string' ? legacy : JSON.stringify(legacy);
      await this.saveScope(key, payload);
      await this.storage.remove(key);
    }
    this.migratedScope.add(key);
  }

  private async countOps(queueKey: string): Promise<number> {
    const result = await this.database.query(
      `SELECT COUNT(*) AS count FROM ${RM_OFFLINE_OPS_TABLE} WHERE queue_key = ?`,
      [queueKey]
    );
    const row = result?.values?.[0];
    if (!row) {
      return 0;
    }
    const value = cell(row, 'count', 0) ?? firstCell(row);
    return Number(value) || 0;
  }

  private async readScopePayload(key: string): Promise<string | null> {
    const result = await this.database.query(
      `SELECT payload FROM ${RM_SCOPE_TABLE} WHERE key = ?`,
      [key]
    );
    const row = result?.values?.[0];
    if (!row) {
      return null;
    }
    const payload = cell(row, 'payload', 0);
    return typeof payload === 'string' ? payload : null;
  }
}

function dedupeByLocalId<T extends RmPersistedOp>(ops: T[]): T[] {
  const indexById = new Map<string, number>();
  const unique: T[] = [];
  ops.forEach((op, sourceIndex) => {
    const localId = op.localId || `missing-${sourceIndex}`;
    const normalized = op.localId ? op : { ...op, localId };
    const existing = indexById.get(localId);
    if (existing == null) {
      indexById.set(localId, unique.length);
      unique.push(normalized);
      return;
    }
    unique[existing] = normalized;
  });
  return unique;
}

function firstCell(row: any): unknown {
  if (Array.isArray(row)) {
    return row[0];
  }
  if (row && typeof row === 'object') {
    const values = Object.values(row);
    return values.length ? values[0] : undefined;
  }
  return undefined;
}

function cell(row: any, name: string, index: number): unknown {
  if (row && typeof row === 'object' && !Array.isArray(row) && name in row) {
    return row[name];
  }
  if (Array.isArray(row)) {
    return row[index];
  }
  return undefined;
}
