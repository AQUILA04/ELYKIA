import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { RmCollectorAssignApiService } from './rm-collector-assign-api.service';
import { RmCollectorAssignQueueService } from './rm-collector-assign-queue.service';
import { RmScopeService } from './rm-scope.service';
import {
  RmCollectorAssignOp,
  RmCollectorAssignRequest,
  RmCollectorAssignResult
} from './rm-collector-assign.models';
import { RmOfflinePack } from './rm.models';

@Injectable({ providedIn: 'root' })
export class RmCollectorAssignWriteService {
  constructor(
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly api: RmCollectorAssignApiService,
    private readonly queue: RmCollectorAssignQueueService,
    private readonly scope: RmScopeService
  ) {}

  async assign(request: RmCollectorAssignRequest): Promise<RmCollectorAssignResult> {
    const collector = (request.collector || '').trim();
    const tontineCollector = (request.tontineCollector || '').trim();
    if (!collector && !tontineCollector) {
      throw new Error('Veuillez sélectionner au moins un commercial crédit ou tontine.');
    }
    if (!request.clientIds?.length) {
      throw new Error('Veuillez sélectionner au moins un client.');
    }

    const selected = (this.scope.getPack()?.clients || []).filter(c => request.clientIds.includes(c.id));
    const creditUnchanged = !collector
      || (selected.length > 0 && selected.every(c => c.collector === collector));
    const tontineUnchanged = !tontineCollector
      || (selected.length > 0 && selected.every(c => c.tontineCollector === tontineCollector));
    if (creditUnchanged && tontineUnchanged) {
      throw new Error('Le(s) commercial(aux) sélectionné(s) sont déjà assignés aux clients choisis.');
    }

    const op = this.buildOp(request, collector, tontineCollector);
    const result = await this.coordinator.executeWrite({
      entityLabel: `RmCollectorAssign:${op.clientIds.join(',')}`,
      forceOffline: request.forceOffline === true,
      saveOnline: async () => {
        await this.api.bulkAssign({
          clientIds: op.clientIds,
          collector: op.collector,
          tontineCollector: op.tontineCollector,
          transferInProgressCredits: op.transferInProgressCredits
        });
        const synced: RmCollectorAssignOp = { ...op, isSync: true, lastError: null };
        await this.queue.upsert(synced);
        await this.applyPackMutation(synced);
        return synced;
      },
      saveOffline: async () => {
        const pending: RmCollectorAssignOp = { ...op, isSync: false };
        await this.queue.upsert(pending);
        await this.applyPackMutation(pending);
        return pending;
      }
    });

    return { op: result.data, mode: result.mode };
  }

  applyPackMutationSync(pack: RmOfflinePack, op: RmCollectorAssignOp): RmOfflinePack {
    const clientIds = new Set(op.clientIds);
    const clients = (pack.clients || []).map(client => {
      if (!clientIds.has(client.id)) {
        return client;
      }
      return {
        ...client,
        collector: op.collector || client.collector,
        tontineCollector: op.tontineCollector || client.tontineCollector
      };
    });

    const lateCredits = (pack.lateCredits || []).map(late => {
      if (!op.transferInProgressCredits || !op.collector || late.clientId == null || !clientIds.has(late.clientId)) {
        return late;
      }
      return { ...late, collector: op.collector };
    });

    const tontineMembers = (pack.tontineMembers || []).map(member => {
      if (!op.tontineCollector || member.clientId == null || !clientIds.has(member.clientId)) {
        return member;
      }
      return { ...member, tontineCollector: op.tontineCollector };
    });

    return { ...pack, clients, lateCredits, tontineMembers };
  }

  private buildOp(
    request: RmCollectorAssignRequest,
    collector: string,
    tontineCollector: string
  ): RmCollectorAssignOp {
    const rand = Math.random().toString(36).slice(2, 8);
    return {
      localId: `assign-${Date.now()}-${rand}`,
      clientIds: [...request.clientIds],
      collector: collector || undefined,
      tontineCollector: tontineCollector || undefined,
      transferInProgressCredits: !!request.transferInProgressCredits && !!collector,
      createdAt: new Date().toISOString(),
      isSync: false,
      lastError: null
    };
  }

  private async applyPackMutation(op: RmCollectorAssignOp): Promise<void> {
    const pack = this.scope.getPack();
    if (!pack) {
      return;
    }
    await this.scope.setPack(this.applyPackMutationSync(pack, op));
  }
}
