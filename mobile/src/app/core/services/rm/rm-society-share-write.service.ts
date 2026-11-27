import { Injectable } from '@angular/core';
import { createRmLocalOpId } from '../../utils/rm-local-op-id.util';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { RmSocietyShareApiService } from './rm-society-share-api.service';
import { RmSocietyShareQueueService } from './rm-society-share-queue.service';
import { RmSocietyShareOp, RmSocietyShareResult } from './rm-society-share.models';
import { mutatePackSocietyShare, offlineSocietyShareResult } from './rm-pack-society-share-mutation.util';
import { RmScopeService } from './rm-scope.service';
import { RmPackTontineMember } from './rm.models';

export interface RmSocietyShareWriteOutcome {
  offline: boolean;
  result: RmSocietyShareResult;
}

/**
 * Le chef de recouvrement valide (montant égal) ou corrige la part société d'un membre.
 * La correction s'applique au membre sans autre validation ; hors ligne, elle part à la reconnexion.
 */
@Injectable({ providedIn: 'root' })
export class RmSocietyShareWriteService {
  constructor(
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly api: RmSocietyShareApiService,
    private readonly queue: RmSocietyShareQueueService,
    private readonly scope: RmScopeService
  ) {}

  async submit(
    member: RmPackTontineMember,
    declaredSocietyShare: number,
    comment?: string | null
  ): Promise<RmSocietyShareWriteOutcome> {
    const declared = Math.round(declaredSocietyShare);
    const localId = createRmLocalOpId('ss', member.id);
    const op: RmSocietyShareOp = {
      localId,
      reference: `SSA-RM-${localId}`.slice(0, 64),
      tontineMemberId: member.id,
      clientName: member.clientName,
      declaredSocietyShare: declared,
      comment: comment || null,
      createdAt: new Date().toISOString(),
      isSync: false,
      lastError: null
    };
    const write = await this.coordinator.executeWrite<RmSocietyShareWriteOutcome>({
      entityLabel: `RmSocietyShare:${member.id}`,
      saveOnline: async () => {
        const result = await this.api.submit(member.id, declared, op.reference, op.comment);
        await this.queue.upsert({ ...op, isSync: true });
        await mutatePackSocietyShare(this.scope, member.id, result);
        return { offline: false, result };
      },
      saveOffline: async () => {
        await this.queue.upsert(op);
        const result = offlineSocietyShareResult(member.societyShare, declared);
        await mutatePackSocietyShare(this.scope, member.id, result);
        return { offline: true, result };
      }
    });
    return write.data;
  }
}
