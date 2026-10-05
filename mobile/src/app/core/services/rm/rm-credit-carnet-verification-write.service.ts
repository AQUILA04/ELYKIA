import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { RmCreditCarnetVerificationApiService } from './rm-credit-carnet-verification-api.service';
import { RmCreditCarnetVerificationQueueService } from './rm-credit-carnet-verification-queue.service';
import { RmScopeService } from './rm-scope.service';
import { RmCreditCarnetVerificationOp } from './rm-credit-carnet-verification.models';
import { RmCreditLate, RmOfflinePack } from './rm.models';

@Injectable({ providedIn: 'root' })
export class RmCreditCarnetVerificationWriteService {
  constructor(
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly api: RmCreditCarnetVerificationApiService,
    private readonly queue: RmCreditCarnetVerificationQueueService,
    private readonly scope: RmScopeService
  ) {}

  async setVerified(credit: RmCreditLate, verified: boolean): Promise<RmCreditCarnetVerificationOp> {
    const op = this.buildOp(credit, verified);
    const result = await this.coordinator.executeWrite({
      entityLabel: `RmCreditCarnetVerification:${op.creditId}`,
      saveOnline: async () => {
        const dto = await this.api.setVerified(op.creditId, verified);
        const synced: RmCreditCarnetVerificationOp = { ...op, isSync: true, lastError: null };
        await this.queue.upsert(synced);
        await this.applyPackMutation(
          credit.id,
          dto.carnetVerified === true,
          dto.carnetVerifiedAt,
          dto.carnetVerifiedBy
        );
        return synced;
      },
      saveOffline: async () => {
        const pending: RmCreditCarnetVerificationOp = { ...op, isSync: false };
        await this.queue.upsert(pending);
        await this.applyPackMutation(credit.id, verified, new Date().toISOString(), 'offline');
        return pending;
      }
    });
    return result.data;
  }

  async bulkSet(credits: RmCreditLate[], verified: boolean): Promise<void> {
    const ids = credits.map(c => c.id);
    const result = await this.coordinator.executeWrite({
      entityLabel: `RmCreditCarnetVerificationBulk:${ids.length}`,
      saveOnline: async () => {
        await this.api.bulkSet(ids, verified);
        for (const credit of credits) {
          await this.applyPackMutation(credit.id, verified, new Date().toISOString(), 'bulk');
        }
        return true;
      },
      saveOffline: async () => {
        for (const credit of credits) {
          await this.queue.upsert(this.buildOp(credit, verified));
          await this.applyPackMutation(credit.id, verified, new Date().toISOString(), 'offline');
        }
        return true;
      }
    });
    void result;
  }

  private buildOp(credit: RmCreditLate, verified: boolean): RmCreditCarnetVerificationOp {
    const rand = Math.random().toString(36).slice(2, 8);
    return {
      localId: `ccv-${credit.id}-${Date.now()}-${rand}`,
      creditId: credit.id,
      clientName: credit.clientName,
      reference: credit.reference,
      verified,
      createdAt: new Date().toISOString(),
      isSync: false,
      lastError: null
    };
  }

  private async applyPackMutation(
      creditId: number,
      verified: boolean,
      at?: string,
      by?: string
  ): Promise<void> {
    const pack = this.scope.getPack();
    if (!pack?.lateCredits) {
      return;
    }
    const nextLates = pack.lateCredits.map(item =>
      item.id === creditId
        ? {
            ...item,
            carnetVerified: verified,
            carnetVerifiedAt: verified ? at : undefined,
            carnetVerifiedBy: verified ? by : undefined
          }
        : item
    );
    const nextPack: RmOfflinePack = { ...pack, lateCredits: nextLates };
    await this.scope.setPack(nextPack);
  }
}
