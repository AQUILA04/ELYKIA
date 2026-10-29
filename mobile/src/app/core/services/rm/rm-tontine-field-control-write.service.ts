import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { AuthService } from '../auth.service';
import { ParameterService } from '../parameter.service';
import { RmTontineFieldControlApiService } from './rm-tontine-field-control-api.service';
import { RmTontineFieldControlQueueService } from './rm-tontine-field-control-queue.service';
import { mutatePackCarnetFlag } from './rm-pack-carnet-mutation.util';
import { RmScopeService } from './rm-scope.service';
import {
  RmTontineFieldControlOp,
  RmTontineFieldControlRequest,
  RmTontineFieldControlResult,
  RmTontineFieldControlStatus,
  TONTINE_AUTO_VERIFY_ON_FIELD_CONTROL
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
    private readonly auth: AuthService,
    private readonly parameters: ParameterService
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
            commercialUsername: m.commercialUsername,
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
          lastError: null,
          carnetVerified: dto.carnetVerified === true,
          carnetVerifiedAt: dto.carnetVerifiedAt,
          carnetVerifiedBy: dto.carnetVerifiedBy
        };
        await this.queue.upsert(synced);
        await this.applyPackMutation(synced, {
          ecartDecisionStatus: dto.ecartDecisionStatus,
          modifiable: dto.modifiable
        });
        if (dto.carnetVerified === true) {
          await this.markCarnetVerified(op.tontineMemberId, dto.carnetVerifiedAt, dto.carnetVerifiedBy);
        }
        return synced;
      },
      saveOffline: async () => {
        const autoVerify = await this.isAutoVerifyEnabled();
        const alreadyVerified = this.isMemberVerified(op.tontineMemberId);
        const verifiedAt = new Date().toISOString();
        const verifiedBy = this.auth.currentUser?.username || 'rm';
        const pending: RmTontineFieldControlOp = {
          ...op,
          isSync: false,
          carnetVerified: autoVerify || alreadyVerified,
          carnetVerifiedAt: autoVerify && !alreadyVerified ? verifiedAt : undefined,
          carnetVerifiedBy: autoVerify && !alreadyVerified ? verifiedBy : undefined
        };
        await this.queue.upsert(pending);
        await this.applyPackMutation(pending);
        if (autoVerify) {
          await this.markCarnetVerified(op.tontineMemberId, verifiedAt, verifiedBy);
        }
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
      commercialUsername: (m.commercialUsername || '').trim(),
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

  private async isAutoVerifyEnabled(): Promise<boolean> {
    const packFlag = this.scope.getPack()?.tontineAutoVerifyOnFieldControl;
    if (typeof packFlag === 'boolean') {
      return packFlag;
    }
    return this.parameters.isEnabled(TONTINE_AUTO_VERIFY_ON_FIELD_CONTROL);
  }

  private isMemberVerified(memberId: number): boolean {
    return this.scope.getPack()?.tontineMembers?.some(
      member => member.id === memberId && member.carnetVerified === true
    ) === true;
  }

  private async markCarnetVerified(memberId: number, at?: string, by?: string): Promise<void> {
    if (this.isMemberVerified(memberId)) {
      return;
    }
    await mutatePackCarnetFlag(
      this.scope,
      'tontineMembers',
      memberId,
      true,
      at || new Date().toISOString(),
      by || this.auth.currentUser?.username || 'rm'
    );
  }

  private async applyPackMutation(
    op: RmTontineFieldControlOp,
    decision?: { ecartDecisionStatus?: string | null; modifiable?: boolean }
  ): Promise<void> {
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
      ecartDecisionStatus: decision
        ? (decision.ecartDecisionStatus ?? null)
        : (op.status === 'ECART' ? 'PENDING' : null),
      modifiable: decision ? decision.modifiable === true : op.status === 'ECART',
      lines: op.months.map(m => ({
        year: m.year,
        month: m.month,
        commercialUsername: m.commercialUsername,
        notebookAmount: m.notebookAmount,
        systemAmount: m.systemAmount || 0,
        differenceAmount: (m.notebookAmount || 0) - (m.systemAmount || 0)
      })),
      collectors: this.buildCollectors(op.months)
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

  private buildCollectors(months: RmTontineFieldControlOp['months']): NonNullable<
    RmOfflinePack['tontineFieldControlsToday'][number]['collectors']
  > {
    const map = new Map<string, { notebook: number; system: number }>();
    for (const m of months) {
      const key = m.commercialUsername || '';
      if (!key) {
        continue;
      }
      const acc = map.get(key) || { notebook: 0, system: 0 };
      acc.notebook += m.notebookAmount || 0;
      acc.system += m.systemAmount || 0;
      map.set(key, acc);
    }
    return Array.from(map.entries()).map(([commercialUsername, acc]) => {
      const differenceAmount = acc.notebook - acc.system;
      return {
        commercialUsername,
        notebookTotalAmount: acc.notebook,
        systemTotalAmount: acc.system,
        differenceAmount,
        status: Math.abs(differenceAmount) < EPSILON ? 'CONFORME' : 'ECART'
      };
    });
  }
}
