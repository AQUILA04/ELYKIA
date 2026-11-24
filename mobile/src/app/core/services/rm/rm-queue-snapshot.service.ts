import { Injectable } from '@angular/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { auditTime } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../logger.service';
import { hasRecoveryManagerProfil } from '../../utils/rm-user.util';
import { RmPendingQueuesService } from './rm-pending-queues.service';
import { RmOfflineOpRow } from './rm-restore.util';

export const RM_QUEUE_SNAPSHOT_PATH = 'elykia/rm-queue-snapshot.json';

export interface RmQueueSnapshot {
  version: 1;
  createdAt: string;
  username: string | null;
  rows: RmOfflineOpRow[];
}

/**
 * Instantané léger des saisies RM non envoyées, réécrit après chaque changement des files
 * (au plus une fois par minute, la dernière modification est toujours écrite).
 * Contrairement à la sauvegarde complète, il ne sert qu'à ne pas perdre une saisie faite entre
 * deux sauvegardes : il est supprimé dès que tout a été envoyé.
 */
@Injectable({ providedIn: 'root' })
export class RmQueueSnapshotService {
  static readonly MIN_INTERVAL_MS = 60_000;

  private initialized = false;
  private lastPendingCount = 0;

  constructor(
    private readonly queues: RmPendingQueuesService,
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
    private readonly log: LoggerService
  ) {}

  /** À appeler une fois au démarrage de l'application. */
  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.queues.pendingCount$
      .pipe(auditTime(RmQueueSnapshotService.MIN_INTERVAL_MS))
      .subscribe(count => void this.onQueuesChanged(count));
  }

  async onQueuesChanged(count: number): Promise<void> {
    if (!hasRecoveryManagerProfil(this.auth.currentUser)) {
      return;
    }
    const wasPending = this.lastPendingCount > 0;
    this.lastPendingCount = count;
    try {
      if (count > 0) {
        await this.write();
      } else if (wasPending) {
        // Tout a été envoyé pendant cette session : l'instantané n'a plus lieu d'être.
        // (Une file vide au démarrage ne le supprime pas : c'est justement le cas à récupérer.)
        await this.clear();
      }
    } catch (error) {
      console.warn('[RmQueueSnapshot] écriture impossible', error);
    }
  }

  async write(): Promise<void> {
    const rows = await this.database.exportUnsyncedRmOps();
    if (!rows.length) {
      return;
    }
    const snapshot: RmQueueSnapshot = {
      version: 1,
      createdAt: new Date().toISOString(),
      username: this.auth.currentUser?.username ?? null,
      rows,
    };
    await Filesystem.mkdir({ path: 'elykia', directory: Directory.Documents, recursive: true })
      .catch(() => undefined);
    await Filesystem.writeFile({
      path: RM_QUEUE_SNAPSHOT_PATH,
      data: JSON.stringify(snapshot),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    void this.log.log(`[RmQueueSnapshot] ${rows.length} saisie(s) en attente enregistrée(s).`);
  }

  async read(): Promise<RmQueueSnapshot | null> {
    try {
      const result = await Filesystem.readFile({
        path: RM_QUEUE_SNAPSHOT_PATH,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      return parseRmQueueSnapshot(typeof result.data === 'string' ? result.data : '');
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    try {
      await Filesystem.deleteFile({ path: RM_QUEUE_SNAPSHOT_PATH, directory: Directory.Documents });
    } catch {
      // Déjà absent.
    }
  }
}

/** Lecture tolérante : un fichier tronqué ou étranger est simplement ignoré. */
export function parseRmQueueSnapshot(raw: string): RmQueueSnapshot | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<RmQueueSnapshot>;
    if (parsed?.version !== 1 || !Array.isArray(parsed.rows)) {
      return null;
    }
    const rows = parsed.rows.filter(
      row => !!row && typeof row.queue_key === 'string' && typeof row.local_id === 'string'
        && typeof row.payload === 'string'
    );
    return rows.length
      ? { version: 1, createdAt: String(parsed.createdAt ?? ''), username: parsed.username ?? null, rows }
      : null;
  } catch {
    return null;
  }
}
