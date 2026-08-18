import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { RmCarnetVerificationApiService } from './rm-carnet-verification-api.service';
import { RmCarnetVerificationQueueService } from './rm-carnet-verification-queue.service';
import { RmScopeService } from './rm-scope.service';
import { RmCarnetVerificationOp } from './rm-carnet-verification.models';
import { RmOfflinePack, RmPackTontineMember } from './rm.models';

@Injectable({ providedIn: 'root' })
export class RmCarnetVerificationWriteService {
  constructor(
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly api: RmCarnetVerificationApiService,
    private readonly queue: RmCarnetVerificationQueueService,
    private readonly scope: RmScopeService
  ) {}

  async setVerified(member: RmPackTontineMember, verified: boolean): Promise<RmCarnetVerificationOp> {
    const op = this.buildOp(member, verified);
    const result = await this.coordinator.executeWrite({
      entityLabel: `RmCarnetVerification:${op.tontineMemberId}`,
      saveOnline: async () => {
        const dto = await this.api.setVerified(op.tontineMemberId, verified);
        const synced: RmCarnetVerificationOp = { ...op, isSync: true, lastError: null };
        await this.queue.upsert(synced);
        await this.applyPackMutation(member.id, dto.carnetVerified === true, dto.carnetVerifiedAt, dto.carnetVerifiedBy);
        return synced;
      },
      saveOffline: async () => {
        const pending: RmCarnetVerificationOp = { ...op, isSync: false };
        await this.queue.upsert(pending);
        await this.applyPackMutation(member.id, verified, new Date().toISOString(), 'offline');
        return pending;
      }
    });
    return result.data;
  }

  async bulkSet(members: RmPackTontineMember[], verified: boolean): Promise<void> {
    const ids = members.map(m => m.id);
    const result = await this.coordinator.executeWrite({
      entityLabel: `RmCarnetVerificationBulk:${ids.length}`,
      saveOnline: async () => {
        await this.api.bulkSet(ids, verified);
        for (const member of members) {
          await this.applyPackMutation(member.id, verified, new Date().toISOString(), 'bulk');
        }
        return true;
      },
      saveOffline: async () => {
        for (const member of members) {
          await this.queue.upsert(this.buildOp(member, verified));
          await this.applyPackMutation(member.id, verified, new Date().toISOString(), 'offline');
        }
        return true;
      }
    });
    void result;
  }

  private buildOp(member: RmPackTontineMember, verified: boolean): RmCarnetVerificationOp {
    const rand = Math.random().toString(36).slice(2, 8);
    return {
      localId: `cv-${member.id}-${Date.now()}-${rand}`,
      tontineMemberId: member.id,
      clientName: member.clientName,
      verified,
      createdAt: new Date().toISOString(),
      isSync: false,
      lastError: null
    };
  }

  private async applyPackMutation(
      memberId: number,
      verified: boolean,
      at?: string,
      by?: string
  ): Promise<void> {
    const pack = this.scope.getPack();
    if (!pack?.tontineMembers) {
      return;
    }
    const nextMembers = pack.tontineMembers.map(item =>
      item.id === memberId
        ? {
            ...item,
            carnetVerified: verified,
            carnetVerifiedAt: verified ? at : undefined,
            carnetVerifiedBy: verified ? by : undefined
          }
        : item
    );
    const nextPack: RmOfflinePack = { ...pack, tontineMembers: nextMembers };
    await this.scope.setPack(nextPack);
  }
}
