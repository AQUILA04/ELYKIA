import { Injectable } from '@angular/core';
import { createRmLocalOpId } from '../../utils/rm-local-op-id.util';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import {
  executeCarnetBulkSet,
  executeCarnetSetVerified,
  RmCarnetVerificationWritePorts
} from './rm-carnet-verification-write.helper';
import { RmCarnetVerificationApiService } from './rm-carnet-verification-api.service';
import { RmCarnetVerificationQueueService } from './rm-carnet-verification-queue.service';
import { mutatePackCarnetFlag } from './rm-pack-carnet-mutation.util';
import { RmScopeService } from './rm-scope.service';
import { RmCarnetVerificationOp } from './rm-carnet-verification.models';
import { RmPackTontineMember } from './rm.models';

@Injectable({ providedIn: 'root' })
export class RmCarnetVerificationWriteService {
  constructor(
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly api: RmCarnetVerificationApiService,
    private readonly queue: RmCarnetVerificationQueueService,
    private readonly scope: RmScopeService
  ) {}

  setVerified(member: RmPackTontineMember, verified: boolean): Promise<RmCarnetVerificationOp> {
    return executeCarnetSetVerified(this.ports(), member, verified);
  }

  bulkSet(members: RmPackTontineMember[], verified: boolean): Promise<void> {
    return executeCarnetBulkSet(this.ports(), members, verified);
  }

  private ports(): RmCarnetVerificationWritePorts<
    RmPackTontineMember,
    RmCarnetVerificationOp,
    Awaited<ReturnType<RmCarnetVerificationApiService['setVerified']>>
  > {
    return {
      coordinator: this.coordinator,
      entityLabel: id => `RmCarnetVerification:${id}`,
      bulkLabel: count => `RmCarnetVerificationBulk:${count}`,
      entityId: member => member.id,
      buildOp: (member, verified) => ({
        localId: createRmLocalOpId('cv', member.id),
        tontineMemberId: member.id,
        clientName: member.clientName,
        verified,
        createdAt: new Date().toISOString(),
        isSync: false,
        lastError: null
      }),
      setVerifiedApi: (id, verified) => this.api.setVerified(id, verified),
      bulkSetApi: (ids, verified) => this.api.bulkSet(ids, verified),
      upsert: op => this.queue.upsert(op),
      applyPackMutation: (id, verified, at, by) =>
        mutatePackCarnetFlag(this.scope, 'tontineMembers', id, verified, at, by)
    };
  }
}
