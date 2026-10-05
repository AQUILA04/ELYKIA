import { Injectable } from '@angular/core';
import { createRmLocalOpId } from '../../utils/rm-local-op-id.util';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import {
  executeCarnetBulkSet,
  executeCarnetSetVerified,
  RmCarnetVerificationWritePorts
} from './rm-carnet-verification-write.helper';
import { RmCreditCarnetVerificationApiService } from './rm-credit-carnet-verification-api.service';
import { RmCreditCarnetVerificationQueueService } from './rm-credit-carnet-verification-queue.service';
import { mutatePackCarnetFlag } from './rm-pack-carnet-mutation.util';
import { RmScopeService } from './rm-scope.service';
import { RmCreditCarnetVerificationOp } from './rm-credit-carnet-verification.models';
import { RmCreditLate } from './rm.models';

@Injectable({ providedIn: 'root' })
export class RmCreditCarnetVerificationWriteService {
  constructor(
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly api: RmCreditCarnetVerificationApiService,
    private readonly queue: RmCreditCarnetVerificationQueueService,
    private readonly scope: RmScopeService
  ) {}

  setVerified(credit: RmCreditLate, verified: boolean): Promise<RmCreditCarnetVerificationOp> {
    return executeCarnetSetVerified(this.ports(), credit, verified);
  }

  bulkSet(credits: RmCreditLate[], verified: boolean): Promise<void> {
    return executeCarnetBulkSet(this.ports(), credits, verified);
  }

  private ports(): RmCarnetVerificationWritePorts<
    RmCreditLate,
    RmCreditCarnetVerificationOp,
    Awaited<ReturnType<RmCreditCarnetVerificationApiService['setVerified']>>
  > {
    return {
      coordinator: this.coordinator,
      entityLabel: id => `RmCreditCarnetVerification:${id}`,
      bulkLabel: count => `RmCreditCarnetVerificationBulk:${count}`,
      entityId: credit => credit.id,
      buildOp: (credit, verified) => ({
        localId: createRmLocalOpId('ccv', credit.id),
        creditId: credit.id,
        clientName: credit.clientName,
        reference: credit.reference,
        verified,
        createdAt: new Date().toISOString(),
        isSync: false,
        lastError: null
      }),
      setVerifiedApi: (id, verified) => this.api.setVerified(id, verified),
      bulkSetApi: (ids, verified) => this.api.bulkSet(ids, verified),
      upsert: op => this.queue.upsert(op),
      applyPackMutation: (id, verified, at, by) =>
        mutatePackCarnetFlag(this.scope, 'lateCredits', id, verified, at, by)
    };
  }
}
