import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { AuthService } from '../auth.service';
import { RmFieldControlApiService } from './rm-field-control-api.service';
import { RmFieldControlQueueService } from './rm-field-control-queue.service';
import { RmScopeService } from './rm-scope.service';
import {
  RmFieldControlOp,
  RmFieldControlRequest,
  RmFieldControlResult,
  RmFieldControlStatus
} from './rm-field-control.models';
import { RmOfflinePack } from './rm.models';

const EPSILON = 0.0001;

@Injectable({ providedIn: 'root' })
export class RmFieldControlWriteService {
  constructor(
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly api: RmFieldControlApiService,
    private readonly queue: RmFieldControlQueueService,
    private readonly scope: RmScopeService,
    private readonly auth: AuthService
  ) {}

  async create(request: RmFieldControlRequest): Promise<RmFieldControlResult> {
    const op = this.buildOp(request);

    const result = await this.coordinator.executeWrite({
      entityLabel: `RmFieldControl:${op.creditId}`,
      forceOffline: request.forceOffline === true,
      saveOnline: async () => {
        const dto = await this.api.create(op.creditId, {
          reference: op.reference,
          notebookTotalAmount: op.notebookTotalAmount,
          note: op.note,
          observedAt: op.observedAt
        });
        const synced: RmFieldControlOp = {
          ...op,
          systemTotalAmountPaid: dto.systemTotalAmountPaid ?? op.systemTotalAmountPaid,
          differenceAmount: dto.differenceAmount ?? op.differenceAmount,
          status: (dto.status as RmFieldControlStatus) || op.status,
          isSync: true,
          lastError: null
        };
        await this.queue.upsert(synced);
        await this.applyPackMutation(synced);
        return synced;
      },
      saveOffline: async () => {
        const pending: RmFieldControlOp = { ...op, isSync: false };
        await this.queue.upsert(pending);
        await this.applyPackMutation(pending);
        return pending;
      }
    });

    return { op: result.data, mode: result.mode };
  }

  private buildOp(request: RmFieldControlRequest): RmFieldControlOp {
    const username = this.auth.currentUser?.username || 'rm';
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const system = request.systemTotalAmountPaid || 0;
    const notebook = request.notebookTotalAmount || 0;
    const difference = notebook - system;
    const status: RmFieldControlStatus = Math.abs(difference) < EPSILON ? 'CONFORME' : 'ECART';

    return {
      localId: `fc-${Date.now()}-${rand}`,
      reference: `CFC-${datePart}-${username}-${request.creditId}-${rand}`.slice(0, 64),
      creditId: request.creditId,
      notebookTotalAmount: notebook,
      systemTotalAmountPaid: system,
      differenceAmount: difference,
      status,
      note: request.note?.trim() || undefined,
      clientName: request.clientName,
      creditReference: request.creditReference,
      observedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isSync: false,
      lastError: null
    };
  }

  private async applyPackMutation(op: RmFieldControlOp): Promise<void> {
    const pack = this.scope.getPack();
    if (!pack) {
      return;
    }

    const todayControls = Array.isArray(pack.creditFieldControlsToday)
      ? [...pack.creditFieldControlsToday]
      : [];
    const entry = {
      creditId: op.creditId,
      reference: op.reference,
      notebookTotalAmount: op.notebookTotalAmount,
      systemTotalAmountPaid: op.systemTotalAmountPaid,
      differenceAmount: op.differenceAmount,
      status: op.status,
      note: op.note,
      observedAt: op.observedAt
    };
    const idx = todayControls.findIndex((c: any) => c?.creditId === op.creditId || c?.reference === op.reference);
    if (idx >= 0) {
      todayControls[idx] = entry;
    } else {
      todayControls.unshift(entry);
    }

    const nextPack: RmOfflinePack = {
      ...pack,
      creditFieldControlsToday: todayControls
    };
    await this.scope.setPack(nextPack);
  }
}
