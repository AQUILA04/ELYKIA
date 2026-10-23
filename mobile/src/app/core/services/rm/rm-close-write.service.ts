import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { OnlineWriteError, WriteErrorKind } from '../online-first-write.types';
import { AuthService } from '../auth.service';
import { RmCloseApiService } from './rm-close-api.service';
import { RmCloseQueueService } from './rm-close-queue.service';
import { RmScopeService } from './rm-scope.service';
import { RmCloseOp, RmCloseRequest, RmCloseResult } from './rm-close.models';
import { RmCreditLate, RmOfflinePack } from './rm.models';

@Injectable({ providedIn: 'root' })
export class RmCloseWriteService {
  constructor(
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly api: RmCloseApiService,
    private readonly queue: RmCloseQueueService,
    private readonly scope: RmScopeService,
    private readonly auth: AuthService
  ) {}

  async closeCredit(request: RmCloseRequest): Promise<RmCloseResult> {
    const op = this.buildOp(request);

    const result = await this.coordinator.executeWrite({
      entityLabel: `RmClose:${op.creditId}`,
      forceOffline: request.forceOffline === true,
      saveOnline: async () => {
        const response = await this.api.closeCredits([{
          creditId: op.creditId,
          amount: op.amount,
          isPartial: op.isPartial,
          reference: op.reference
        }]);

        const failure = response.failures?.find(f => f.creditId === op.creditId);
        if (failure) {
          throw new OnlineWriteError(
            WriteErrorKind.BUSINESS,
            failure.errorMessage || 'Clôture refusée par le serveur'
          );
        }

        const success = response.successes?.find(s => s.creditId === op.creditId);
        if (!success && (response.failures?.length || 0) > 0) {
          throw new OnlineWriteError(
            WriteErrorKind.BUSINESS,
            response.failures![0].errorMessage || 'Clôture échouée'
          );
        }

        const synced: RmCloseOp = { ...op, isSync: true, lastError: null };
        await this.queue.upsert(synced);
        await this.applyPackMutation(synced);
        return synced;
      },
      saveOffline: async () => {
        const pending: RmCloseOp = { ...op, isSync: false };
        await this.queue.upsert(pending);
        await this.applyPackMutation(pending);
        return pending;
      }
    });

    return { op: result.data, mode: result.mode };
  }

  private buildOp(request: RmCloseRequest): RmCloseOp {
    const username = this.auth.currentUser?.username || 'rm';
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const reference = `RMO-${datePart}-${username}-${request.creditId}-${rand}`.slice(0, 64);

    return {
      localId: `local-${Date.now()}-${rand}`,
      reference,
      creditId: request.creditId,
      amount: request.amount,
      isPartial: request.isPartial,
      clientName: request.clientName,
      creditReference: request.creditReference,
      commercialUsername: request.commercialUsername,
      clientReliquatApplied: request.clientReliquatApplied,
      originalRemaining: request.originalRemaining,
      createdAt: new Date().toISOString(),
      isSync: false,
      lastError: null
    };
  }

  private async applyPackMutation(op: RmCloseOp): Promise<void> {
    const pack = this.scope.getPack();
    if (!pack) {
      return;
    }

    const lateCredits = this.applyClose([...(pack.lateCredits || [])], op);
    if (!lateCredits) {
      return;
    }
    const inProgressCredits = pack.inProgressCredits
      ? (this.applyClose([...pack.inProgressCredits], op) ?? pack.inProgressCredits)
      : pack.inProgressCredits;

    const nextPack: RmOfflinePack = {
      ...pack,
      lateCredits,
      inProgressCredits,
      stats: {
        ...pack.stats,
        lateCredits: lateCredits.length,
        clients: pack.stats?.clients ?? pack.clients?.length ?? 0,
        estimatedBytes: pack.stats?.estimatedBytes ?? 0
      }
    };
    await this.scope.setPack(nextPack);
  }

  /** Returns null when the credit is absent from the list. */
  private applyClose(credits: RmCreditLate[], op: RmCloseOp): RmCreditLate[] | null {
    const idx = credits.findIndex(c => c.id === op.creditId);
    if (idx < 0) {
      return null;
    }
    const current = credits[idx];
    const remaining = current.totalAmountRemaining ?? op.originalRemaining ?? 0;
    const paid = current.totalAmountPaid ?? 0;
    if (!op.isPartial) {
      credits.splice(idx, 1);
      return credits;
    }
    const nextRemaining = Math.max(0, remaining - op.amount);
    credits[idx] = {
      ...current,
      totalAmountRemaining: nextRemaining,
      totalAmountPaid: paid + op.amount
    };
    if (nextRemaining <= 0) {
      credits.splice(idx, 1);
    }
    return credits;
  }
}
