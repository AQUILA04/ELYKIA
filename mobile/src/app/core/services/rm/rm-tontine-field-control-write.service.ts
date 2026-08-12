import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { AuthService } from '../auth.service';
import { RmTontineFieldControlApiService } from './rm-tontine-field-control-api.service';
import { RmTontineFieldControlQueueService } from './rm-tontine-field-control-queue.service';
import { RmScopeService } from './rm-scope.service';
import {
  RmTontineFieldControlOp,
  RmTontineFieldControlRequest,
  RmTontineFieldControlResult,
  RmTontineFieldControlStatus
} from './rm-tontine-field-control.models';
import { RmOfflinePack } from './rm.models';

const EPSILON = 0.0001;

@Injectable({ providedIn: 'root' })
export class RmTontineFieldControlWriteService {
  constructor(
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly api: RmTontineFieldControlApiService,
    private readonly queue: RmTontineFieldControlQueueService,
    private readonly scope: RmScopeService,
    private readonly auth: AuthService
  ) {}

  async create(request: RmTontineFieldControlRequest): Promise<RmTontineFieldControlResult> {
    const op = this.buildOp(request);

    const result = await this.coordinator.executeWrite({
      entityLabel: `RmTontineFieldControl:${op.tontineMemberId}`,
      forceOffline: request.forceOffline === true,
      saveOnline: async () => {
        const dto = await this.api.create(op.tontineMemberId, {
          reference: op.reference,
          months: op.months.map(m => ({
            year: m.year,
            month: m.month,
            notebookAmount: m.notebookAmount
          })),
          note: op.note,
          observedAt: op.observedAt
        });
        const synced: RmTontineFieldControlOp = {
          ...op,
          notebookTotalAmount: dto.notebookTotalAmount ?? op.notebookTotalAmount,
          systemTotalAmount: dto.systemTotalAmount ?? op.systemTotalAmount,
          differenceAmount: dto.differenceAmount ?? op.differenceAmount,
          status: (dto.status as RmTontineFieldControlStatus) || op.status,
          isSync: true,
          lastError: null
        };
        await this.queue.upsert(synced);
        await this.applyPackMutation(synced);
        return synced;
      },
      saveOffline: async () => {
        const pending: RmTontineFieldControlOp = { ...op, isSync: false };
        await this.queue.upsert(pending);
        await this.applyPackMutation(pending);
        return pending;
      }
    });

    return { op: result.data, mode: result.mode };
  }

  private buildOp(request: RmTontineFieldControlRequest): RmTontineFieldControlOp {
    const username = this.auth.currentUser?.username || 'rm';
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const months = (request.months || []).map(m => ({
      year: m.year,
      month: m.month,
      notebookAmount: m.notebookAmount || 0,
      systemAmount: m.systemAmount || 0
    }));
    const notebookTotal = months.reduce((sum, m) => sum + (m.notebookAmount || 0), 0);
    const systemTotal = months.reduce((sum, m) => sum + (m.systemAmount || 0), 0);
    const difference = notebookTotal - systemTotal;
    const status: RmTontineFieldControlStatus = Math.abs(difference) < EPSILON ? 'CONFORME' : 'ECART';

    return {
      localId: `tfc-${Date.now()}-${rand}`,
      reference: `TFC-${datePart}-${username}-${request.tontineMemberId}-${rand}`.slice(0, 64),
      tontineMemberId: request.tontineMemberId,
      clientName: request.clientName,
      months,
      notebookTotalAmount: notebookTotal,
      systemTotalAmount: systemTotal,
      differenceAmount: difference,
      status,
      note: request.note?.trim() || undefined,
      observedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isSync: false,
      lastError: null
    };
  }

  private async applyPackMutation(op: RmTontineFieldControlOp): Promise<void> {
    const pack = this.scope.getPack();
    if (!pack) {
      return;
    }

    const todayControls = Array.isArray(pack.tontineFieldControlsToday)
      ? [...pack.tontineFieldControlsToday]
      : [];
    const entry = {
      tontineMemberId: op.tontineMemberId,
      reference: op.reference,
      notebookTotalAmount: op.notebookTotalAmount,
      systemTotalAmount: op.systemTotalAmount,
      differenceAmount: op.differenceAmount,
      status: op.status,
      note: op.note,
      observedAt: op.observedAt,
      lines: op.months.map(m => ({
        year: m.year,
        month: m.month,
        notebookAmount: m.notebookAmount,
        systemAmount: m.systemAmount || 0,
        differenceAmount: (m.notebookAmount || 0) - (m.systemAmount || 0)
      }))
    };
    const idx = todayControls.findIndex(
      c => c?.tontineMemberId === op.tontineMemberId || c?.reference === op.reference
    );
    if (idx >= 0) {
      todayControls[idx] = entry;
    } else {
      todayControls.unshift(entry);
    }

    const nextPack: RmOfflinePack = {
      ...pack,
      tontineFieldControlsToday: todayControls
    };
    await this.scope.setPack(nextPack);
  }
}
