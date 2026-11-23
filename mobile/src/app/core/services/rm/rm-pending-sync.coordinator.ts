import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../auth.service';
import { ConnectivityService } from '../connectivity.service';
import { LoggerService } from '../logger.service';
import { hasRecoveryManagerProfil } from '../../utils/rm-user.util';
import { RmCarnetVerificationSyncService } from './rm-carnet-verification-sync.service';
import { RmCloseSyncService } from './rm-close-sync.service';
import { RmCollectorAssignSyncService } from './rm-collector-assign-sync.service';
import { RmContactSyncService } from './rm-contact-sync.service';
import { RmCreditCarnetVerificationSyncService } from './rm-credit-carnet-verification-sync.service';
import { RmFieldControlSyncService } from './rm-field-control-sync.service';
import { RmPendingQueuesService } from './rm-pending-queues.service';
import { RmTontineFieldControlSyncService } from './rm-tontine-field-control-sync.service';

interface SyncWaveResult {
  synced: number;
  failed: number;
  errors: string[];
}

export interface RmPendingSyncOutcome {
  status: 'done' | 'offline' | 'nothing' | 'ignored';
  synced: number;
  failed: number;
  /** Opérations encore en attente après la vague. */
  remaining: number;
}

const IGNORED: RmPendingSyncOutcome = { status: 'ignored', synced: 0, failed: 0, remaining: 0 };

/**
 * Envoie automatiquement les saisies RM en attente : retour du réseau, reprise de l'application,
 * connexion, ou à la demande (avant déconnexion). Une seule vague à la fois ; en cas d'échec,
 * nouvelles tentatives espacées (1 s, 5 s, 15 s, 1 min) puis arrêt jusqu'au prochain déclencheur.
 */
@Injectable({ providedIn: 'root' })
export class RmPendingSyncCoordinator {
  static readonly BACKOFF_MS = [1_000, 5_000, 15_000, 60_000];

  readonly syncing$ = new BehaviorSubject<boolean>(false);

  private running: Promise<RmPendingSyncOutcome> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private attempt = 0;
  private sessionBlocked = false;
  private initialized = false;

  constructor(
    private readonly auth: AuthService,
    private readonly connectivity: ConnectivityService,
    private readonly platform: Platform,
    private readonly log: LoggerService,
    private readonly pending: RmPendingQueuesService,
    private readonly assignSync: RmCollectorAssignSyncService,
    private readonly contactSync: RmContactSyncService,
    private readonly fieldControlSync: RmFieldControlSyncService,
    private readonly tontineFieldControlSync: RmTontineFieldControlSyncService,
    private readonly carnetSync: RmCarnetVerificationSyncService,
    private readonly creditCarnetSync: RmCreditCarnetVerificationSyncService,
    private readonly closeSync: RmCloseSyncService
  ) {}

  /** À appeler une fois au démarrage de l'application. */
  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.request('réseau retrouvé'));
    }
    this.platform.resume?.subscribe(() => this.request("reprise de l'application"));
    this.auth.sessionExpiredKeptData$.subscribe(() => {
      // Le jeton ne peut pas être renouvelé : inutile d'insister avant une reconnexion.
      this.sessionBlocked = true;
      this.cancelRetry();
    });
    this.request('démarrage');
  }

  /** Déclenche une vague sans attendre le résultat (nouvelle série de tentatives). */
  request(reason: string): void {
    this.attempt = 0;
    this.cancelRetry();
    void this.syncNow(reason);
  }

  /** À appeler après une connexion réussie : lève le blocage lié à la session expirée. */
  onSessionOpened(): void {
    this.sessionBlocked = false;
    this.request('connexion');
  }

  syncNow(reason: string): Promise<RmPendingSyncOutcome> {
    this.running ??= this.runWave(reason).finally(() => {
      this.running = null;
      this.syncing$.next(false);
    });
    return this.running;
  }

  private async runWave(reason: string): Promise<RmPendingSyncOutcome> {
    if (!this.auth.isAuthenticated || !hasRecoveryManagerProfil(this.auth.currentUser)) {
      return IGNORED;
    }
    if (this.sessionBlocked) {
      return { ...IGNORED, remaining: await this.safeRemaining() };
    }
    if (!(await this.pending.hasPending())) {
      return { status: 'nothing', synced: 0, failed: 0, remaining: 0 };
    }
    if (!(await this.connectivity.checkBackendReachable(true))) {
      return { status: 'offline', synced: 0, failed: 0, remaining: await this.safeRemaining() };
    }

    this.syncing$.next(true);
    void this.log.log(`[RmAutoSync] Vague d'envoi (${reason}), tentative ${this.attempt + 1}.`);
    const wave = await this.sendEverything();
    const remaining = await this.safeRemaining();
    void this.log.log(
      `[RmAutoSync] ${wave.synced} envoyée(s), ${wave.failed} échec(s), ${remaining} en attente.`
      + (wave.errors[0] ? ` Premier échec : ${wave.errors[0]}` : '')
    );

    if (wave.failed > 0 && remaining > 0) {
      this.scheduleRetry();
    } else {
      this.attempt = 0;
    }
    return { status: 'done', synced: wave.synced, failed: wave.failed, remaining };
  }

  /** Chaque file est isolée : l'échec de l'une n'empêche pas l'envoi des autres. */
  private async sendEverything(): Promise<SyncWaveResult> {
    const steps: Array<[string, () => Promise<SyncWaveResult>]> = [
      ['transferts', () => this.assignSync.syncPending()],
      ['contacts', () => this.contactSync.syncPending()],
      ['contrôles crédit', () => this.fieldControlSync.syncPending()],
      ['contrôles tontine', () => this.tontineFieldControlSync.syncPending()],
      ['carnets tontine', () => this.carnetSync.syncPending()],
      ['carnets crédit', () => this.creditCarnetSync.syncPending()],
      ['clôtures', () => this.closeSync.syncPending()],
    ];
    const total: SyncWaveResult = { synced: 0, failed: 0, errors: [] };
    for (const [label, run] of steps) {
      try {
        const result = await run();
        total.synced += result.synced;
        total.failed += result.failed;
        total.errors.push(...result.errors);
      } catch (error) {
        total.failed += 1;
        total.errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return total;
  }

  private scheduleRetry(): void {
    const delay = RmPendingSyncCoordinator.BACKOFF_MS[this.attempt];
    if (delay === undefined || this.sessionBlocked) {
      return;
    }
    this.attempt += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.syncNow('nouvelle tentative');
    }, delay);
  }

  private cancelRetry(): void {
    if (this.retryTimer !== undefined) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
  }

  private async safeRemaining(): Promise<number> {
    try {
      return await this.pending.pendingCount();
    } catch {
      return 0;
    }
  }
}
